/**
 * Copyright (C) 2013, all rights reserved.
 * Company	SHENZHEN YUNZHONGFEI TECHNOLOGY CORP., LTD. 
 * Author	lailong
 * Since	2013-10-23
 */
package com.nearme.gamecenter.open.api;

import android.os.Parcel;
import android.os.Parcelable;
import android.text.TextUtils;

/**
 * 消耗可币参数
 * 
 * @Author	lailong
 * @Since	2013-10-23
 */
public class PayInfo implements Parcelable {

	/**
	 * 订单号，请保证每次请求唯一,限制长度为100
	 */
	private String order;
	/**
	 * 自定义回调字段，限制长度为200
	 */
	private String attach;
	/**
	 * 此次支付消耗可币的总金额，单位为分（1可币=1元RMB）
	 */
	private int amount;
	
	/**
	 * 商品名（限制长度为50）
	 */
	private String productName = "";
	/**
	 * 商品描述（限制长度为100）
	 */
	private String productDesc = "";
	/**
	 * POST回调地址，不可带参数。
	 */
	private String callbackUrl = "";
	
	/**
	 * 可币券id
	 */
	protected int voucherId;
	/**
	 * 可币券类型
	 */
	protected int voucherType;
	/**
	 * 要支付的可币券的金额
	 */
	protected int voucherCount;
	
	public PayInfo(String order, String attach, int amount) {
		super();
		if (TextUtils.isEmpty(order) || amount <= 0) {
			throw new RuntimeException("invalid params when create PayInfo.");
		}
		this.order = order;
		this.attach = attach;
		this.amount = amount;
	}
	public String getOrder() {
		return order;
	}
	public void setOrder(String order) {
		this.order = order;
	}
	public String getAttach() {
		return attach;
	}
	public void setAttach(String attach) {
		this.attach = attach;
	}
	public int getAmount() {
		return amount;
	}
	public void setAmount(int amount) {
		this.amount = amount;
	}
	public String getProductName() {
		return productName;
	}
	public void setProductName(String productName) {
		this.productName = productName;
	}
	public String getProductDesc() {
		return productDesc;
	}
	public void setProductDesc(String productDesc) {
		this.productDesc = productDesc;
	}
	public String getCallbackUrl() {
		return callbackUrl;
	}
	public void setCallbackUrl(String callbackUrl) {
		this.callbackUrl = callbackUrl;
	}
	
	public int getVoucherId() {
		return voucherId;
	}
	public void setVoucherId(int id) {
		this.voucherId = id;
	}
	public int getVoucherType() {
		return voucherType;
	}
	public void setVoucherType(int voucherType) {
		this.voucherType = voucherType;
	}
	public int getVoucherCount() {
		return voucherCount;
	}
	public void setVoucherCount(int voucherCount) {
		this.voucherCount = voucherCount;
	}
	
	@Override
	public void writeToParcel(Parcel dest, int flags) {
		// for payinfo
		dest.writeString(getOrder());
		dest.writeString(getAttach());
		dest.writeInt(getAmount());
		
		dest.writeString(getCallbackUrl());
		dest.writeString(getProductName());
		dest.writeString(getProductDesc());
		dest.writeInt(getVoucherId());
		dest.writeInt(getVoucherType());
		dest.writeInt(getVoucherCount());
		
		
	}
	
	public static final Parcelable.Creator<PayInfo> CREATOR = new Creator<PayInfo>() {

		@Override
		public PayInfo createFromParcel(Parcel source) {
			final PayInfo ratePayInfo = new PayInfo(source.readString(), source.readString(), source.readInt());
			
			ratePayInfo.setCallbackUrl(source.readString());
			ratePayInfo.setProductName(source.readString());
			ratePayInfo.setProductDesc(source.readString());
			ratePayInfo.setVoucherId(source.readInt());
			ratePayInfo.setVoucherType(source.readInt());
			ratePayInfo.setVoucherCount(source.readInt());
			return ratePayInfo;
		}

		@Override
		public PayInfo[] newArray(int size) {
			return new PayInfo[size];
		}

	};

	@Override
	public int describeContents() {
		return 0;
	}
	
}
