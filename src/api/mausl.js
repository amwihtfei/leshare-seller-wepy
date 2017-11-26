import base from './base';
import Page from '../utils/Page';

/**
 * 商品服务类
 */
export default class mausl extends base {
  /**
   * 返回分页对象
   */
  static page () {
    let url = `${this.baseUrl}/goods?goods_status=onSale`;
    return new Page(url, item => {
      this._processGoodsDiscount(item);
      this._processGoodsData(item);
    });
  }

  /**
   * 获取商品库存
   */
  static stock (goodsId, sku = '') {
    const url = `${this.baseUrl}/goods/${goodsId}/stock?sku=${sku}`;
    return this.get(url).then(data => data.stock);
  }

  /**
   * 查询商品目录
   */
  static categories (pid = 0) {
    const url = `${this.baseUrl}/goods/inner_category`;
    return this.get(url).then(data => this._createGoodsCategories(data));
  }

  /**
   * 查询商品详情
   */
  static getInfo (goodsId) {
    const url = `${this.baseUrl}/goods/${goodsId}`;
    return this.get(url, {}).then(data => this._processGoodsDetail(data));
  }
  /**
   * 创建订单
   */
  static createOrder (trade, address) {
    const url = `${this.baseUrl}/orders`;
    return this.post(url, trade);
  }
  /**
   * 卖家查询配送模板GET /v2/seller/delivery
   */
  static deliveryInfo () {
    const url = `${this.baseUrl}/delivery`;
    return this.get(url);
  }

  /**
   * 卖家获取普通用户列表
   */
  static customersList () {
    const url = `${this.baseUrl}/customers/list`;
    return new Page(url, item => this._processUserInfo(item));
  }
  /**
   * 卖家获取会员用户列表
   */
  static membersList () {
    const url = `${this.baseUrl}/members/list`;
    return new Page(url, item => this._processUserInfo(item));
  }
  /**
   * 查找买家默认地址
   */
  static defaultAddress (customerId) {
    const url = `${this.baseUrl}/addresses/default?customer_id=${customerId}`;
    return this.get(url, {}).then(data => this._processOrderAddress(data));
  }
  /**
   * 查找买家地址列表
   */
  static addressList (customerId) {
    const url = `${this.baseUrl}/addresses/?customer_id=${customerId}`;
    return new Page(url, item => this._processOrderAddress(item));
  }
  /** ********************* 数据处理方法 ***********************/
  /**
   * 处理订单地址
   */
  static _processOrderAddress (address) {
    let data = {};
    if (address) {
      data.name = address.name;
      data.sexText = address.setText;
      data.phone = address.phone;
      data.simpleAddress = address.fullAddress;
      data.isDefault = address.isDefault;
    } else {
      data = null;
    }
    return data;
  }
  static _createGoodsCategories (data) {
    const list = [];
    if (data != null) {
      list.push(...data.map(item => {
        return {
          id: item.id,
          title: item.name
        };
      }));
    }
    return {
      list: list,
      selectedId: 9,
      scroll: false
    };
  }

  /**
   * 处理折扣价格
   */
  static _processGoodsDiscount(goods, discount) {
    const isDiscount = discount != null ? discount.categories.some(cid => cid == goods.innerCid) : false;
    if (!isDiscount) {
      return;
    }
    const rate = discount.rate / 100;
    const isSku = goods.goodsSkuInfo;
    if (isSku) {
      // 多规格数据处理
      const skuList = goods.goodsSkuInfo.goodsSkuDetails;
      skuList.forEach(item => {
        const detail = item.goodsSkuDetailBase;
        const price = detail.price;
        // 最低的价格作为原价
        if (item.originalPrice == null || price < item.originalPrice) {
          item.originalPrice = price;
        }
        // 设置原价和当前价格
        detail.originalPrice = price;
        detail.price = (price * rate).toFixed(2);
      });
    } else {
      // 单规格数据处理
      goods.originalPrice = goods.sellPrice;
      goods.sellPrice = (goods.sellPrice * rate).toFixed(2);
    }
    // 折扣文本展现
    goods.discountRate = discount.rate / 10 + '折';
    goods.discountText = `会员折扣`;
    goods.discount = true;
  }

  /**
   * 处理运费信息
   */
  static _processGoodsPostFeeText (detail) {
    const fee = detail.postFee;
    let feeText = '';
    if (!fee || fee == 0) {
      feeText = '配送：免运费';
    } else {
      feeText = `同城配送：￥${fee} (支持自提)`;
    }
    detail.feeText = feeText;
  }

  /**
   * 处理价格商品区间
   */
  static _processGoodsPriceRange (detail) {
    if (!detail.goodsSkuInfo || !detail.goodsSkuInfo.goodsSkuDetails) {
      return;
    }
    const skuDetails = detail.goodsSkuInfo.goodsSkuDetails;
    let maxPrice = 0;
    let minPrice = Number.MAX_VALUE;

    for (let i in skuDetails) {
      const detail = skuDetails[i].goodsSkuDetailBase;
      maxPrice = Math.max(detail.price, maxPrice);
      minPrice = Math.min(detail.price, minPrice);
    }
    detail.maxPrice = maxPrice;
    detail.minPrice = minPrice;
  }

  /**
   * 处理价格展现标签 / 需要先调用区间处理
   */
  static _processGoodsPriceLabel (detail) {
    let priceLable = detail.sellPrice;

    if (detail.maxPrice && detail.minPrice) {
      // priceLable = `${detail.minPrice}~${detail.maxPrice}`;
      priceLable = detail.minPrice;
    }
    detail.priceLable = isNaN(detail.priceLable) ? priceLable : priceLable.toFixed.toFixed(2);
  }

  /**
   * 处理SKU标签
   */
  static _processSkuLable (detail) {
    const skuInfo = detail.goodsSkuInfo;
    if (!skuInfo) {
      return;
    }

    const skuLabels = [];
    for (let i = 1; i <= 3; i++) {
      const skuKey = skuInfo[`prop${i}`];
      const skuValueStr = skuInfo[`value${i}`];
      if (skuKey && skuValueStr) {
        const skuValues = skuValueStr.split(',');
        const sku = {
          key: skuKey,
          value: skuValues
        };
        skuLabels.push(sku);
      } else {
        break;
      }
    }
    detail.labels = skuLabels;
  }

  /**
   * 处理商品信息
   */
  static _processGoodsData (item) {
    // 结构赋值
    const {name, sellPrice, originalPrice} = item;

    // 长名字处理
    if (name.length > 12) {
      item.simple_name = name.substring(0, 12) + '...';
    }
    // 长名字处理
    if (name.length > 30) {
      item.name = name.substring(0, 30) + '...';
    }

    // 销售价处理
    if (originalPrice == null || originalPrice == 0) {
      item.originalPrice = sellPrice;
    }

    // 处理图片
    this._processGoodsPreview(item);
    this._processSkuLable(item);
    this._processGoodsPriceRange(item);
    this._processGoodsPriceLabel(item);
    this._processGoodsQuantity(item);
  }

  /**
   * 处理数量（已购买）
   */
  static _processGoodsQuantity (item) {
    item.num = 0;
  }

  /**
   * 处理预览图
   */
  static _processGoodsPreview (item) {
    const images = item.images;
    // 图片处理
    if (images == null || images.length < 1) {
      item.imageUrl = '/images/goods/broken.png';
    } else if (images[0].url == null) {
      item.imageUrl = '/images/goods/broken.png';
    } else {
      item.imageUrl = images[0].url + '/medium';
    }
  }
  /**
   * 购物车下单
   */
  static createCartTrade (goodsList, param) {
    const orderGoodsInfos = [];
    let price = 0;
    // 根据购物车信息，构造订单的商品列表
    for (let i in goodsList) {
      const goods = goodsList[i];
      const info = {
        goodsId: goods.goodsId,
        goodsName: goods.goodsName,
        imageUrl: goods.goodsImage,
        goodsPrice: goods.goodsPrice,
        count: goods.goodsNum,
        innerCid: goods.innerCid,
        skuText: goods.skuText,
        goodsSku: goods.goodsSku,
        goodsSellPrice: goods.originalPrice,
        discount: goods.discount,
        discountRate: goods.discountRate,
        discountText: goods.discountText
      };
      orderGoodsInfos.push(info);
      price += goods.goodsPrice * goods.goodsNum;
    }
    let finalPrice = price;
    let reduceFee = 0;
    if (param && param.reduce) {
      reduceFee = param.reduce.fee;
      finalPrice -= reduceFee;
      if (finalPrice < 0) {
        finalPrice = 0;
      }
    }
    finalPrice = finalPrice.toFixed(2);
    // 构造交易对象
    const trade = {
      orderType: param.orderType,
      dealPrice: price.toFixed(2),
      reduceFee: reduceFee,
      finalPrice: finalPrice,
      postFee: (0).toFixed(2),
      paymentType: '1',
      paymentText: '在线支付',
      orderGoodsInfos: orderGoodsInfos,
      shopName: this.shopName
    };
    if (param.orderType == '30') {
      trade.arriveTime = '立即出餐';
    }
    return trade;
  }
  /**
   * 上报FORM
   */
  static reportFormId(id, delay = 3000) {
    try {
      const url = `${this.baseUrl}/visit_shops/form_id`;
      const param = [{
        formId: id
      }];
      if (delay > 0) {
        setTimeout(() => {
          this.post(url, param, false);
        }, delay);
      } else {
        this.post(url, param, false);
      }
    } catch (e) {
      console.warn('formid上报错误', e);
    }
  }

  /**
   * 用户信息处理
   */
  static _processUserInfo (item) {
    const userInfo = {};
    userInfo.id = item.id;
    userInfo.memberId = item.memberId;
    userInfo.avatar = item.avatarUrl;
    userInfo.name = item.nickName;
    userInfo.key = '创建时间：';
    userInfo.value = item.createTime;
    return userInfo;
  }
}