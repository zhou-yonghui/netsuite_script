/**
 * 创建沃尔玛payment表
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/record', 'N/file', 'N/search', './moment', 'N/encode','N/format'],
    function(record, file , search, moment, encode,format) {
        function onRequest(context) {
            try {
                log.debug({
                    title: 'context',
                    details: JSON.stringify(context)
                });
                log.debug('body',JSON.stringify(context.request.body));
                var payment = JSON.parse(context.request.body);
                var recId = walmartNsPayment(payment);
                log.debug({
                    title: 'recId',
                    details: recId
                });
                var obj = {};
                obj.walmartOrderNumber = payment.walmartOrderNumber+'';
                obj.nsPaymentId = recId+'';
                obj.tranid = record.load({type:'customrecord_walmart_payment',id:recId}).getValue('tranid');
                obj.success = true;
                obj.message = 'success';
                context.response.write(JSON.stringify(obj));
            } catch (e) {
                log.debug({
                    title: 'error',
                    details: e.message + ',' + e.stack
                });
                var obj = {};
                obj.walmartOrderNumber = "";
                obj.nsPaymentId = "";
                obj.tranid = "";
                obj.success = false;
                obj.message = e.message + ',' + e.stack;
                context.response.write(JSON.stringify(obj));
            }
        }

        function walmartNsPayment(payment){
            var payments = payment;
            log.debug({
                title: 'payments',
                details: payments
            })
            var soData = getSo(payments.purchaseOrderNumber);//销售订单信息
            var storeData = getStore(payments.storeNsId);//销售店铺信息
            var nsSku = getSkuCorrelation(payments.partnerItemId);//系统sku
            log.debug('data','soData:' + JSON.stringify(soData) + '----storeData:' + JSON.stringify(storeData) + '---nsSku:' + nsSku);
            var rec = record.create({
                type: 'customrecord_walmart_payment',
                isDynamic: true
            });
            /* 主要信息 */
            //rec.setText('customform','Standard Walmart payment主表 Form-首选');
            rec.setValue('custrecord_pay_seller_id',payments.sellerId);//卖方ID
            if(soData.customer){
                rec.setValue('custrecord_customer',soData.customer);//客户 todo:销售订单客户
            }
            rec.setValue('custrecord_wal_availableapreportdates',payments.availableApReportDates);//可用Ap报告日期
            rec.setValue('custrecord_wal_walmart_order_number',payments.walmartOrderNumber);//沃尔玛订单号
            rec.setValue('custrecord_wal_walmart_order_number_line',payments.walmartOrderNumberLine);//沃尔玛订单号行
            rec.setValue('custrecord_wal_purchase_order_number',payments.purchaseOrderNumber);//采购订单号 todo:店铺单号
            rec.setValue('custrecord_walpurchase_order_number_line',payments.purchaseOrderNumberLine);//采购订单号行
            rec.setValue('custrecord_wal_partner_order_number',payments.partnerOrderNumber);//合作伙伴的订单号
            rec.setValue('custrecord_wal_transaction_type',payments.transactionType);//交易类型
            rec.setValue('custrecord_wal_transaction_date_time',format.parse({value:payments.transactionDateTime,type:format.Type.DATE}));//交易时间
            rec.setValue('custrecord_wal_partner_item_id',payments.partnerItemId);//合作伙伴项目ID(店铺SKU) todo:店铺sku
            if(soData){
                rec.setValue('custrecordcustrecord_pay_wal_sonumber',soData.soId);//销售订单号
            }
            rec.setValue('custrecordcustrecord_hx_pay_wal_store',payments.storeNsId);//店铺
            if(storeData){
                rec.setValue('custrecordcustrecord_hx_pay_wal_platform',storeData.platform);//平台
            }
            if(nsSku){
                rec.setValue('custrecord_nssku',nsSku);//系统sku
            }
            if(soData.currency){
                rec.setValue('custrecord_currency_payement',soData.currency);//币种 todo：销售订单币种
            }else if(storeData.currency){
                rec.setValue('custrecord_currency_payement',storeData.currency);//币种 todo：店铺币种
            }
            /* 交易信息 */
            rec.setValue('custrecord_wal_shipped_qty',payments.shippedQty);//出货数量
            rec.setValue('custrecord_wal_partner_gtin',payments.partnerGTIN);//合作伙伴GTIN
            rec.setValue('custrecord_wal_partner_item_name',payments.partnerItemName);//合作项目名称
            rec.setValue('custrecord_wal_product_tax_code',payments.productTaxCode);//产品税码
            rec.setValue('custrecord_wal_shipping_tax_code',payments.shippingTaxCode);//船运税码
            rec.setValue('custrecord_wal_gift_wrap_taxcode',payments.giftWrapTaxCode);//礼品包装税码
            rec.setValue('custrecord_wal_ship_to_state',payments.shipToState);//运送到州
            rec.setValue('custrecord_wal_ship_to_county',payments.shipToCounty);//运送到县
            rec.setValue('custrecordcustrecord_wal_ship_countycode',payments.countyCode);//县代码
            rec.setValue('custrecordcustrecord_wal_ship_to_city',payments.shipToCity);//收货城市
            rec.setValue('custrecord_wal_zip_code',payments.zipCode);//邮政编码
            rec.setValue('custrecord_wal_shipping_method',payments.shippingMethod);//送货方式
            rec.setValue('custrecord_wal_total_tender_customer',payments.TotalTenderCustomer);//总投标客户
            rec.setValue('custrecord_wal_payable_partner_sale',payments.payablePartnerSale);//支持合作伙伴销售
            rec.setValue('custrecord_wal_commission_from_sale',payments.commissionFromSale);//销售佣金
            rec.setValue('custrecord_wal_commission_rate',payments.commissionRate);//销售佣金费率
            rec.setValue('custrecord_wal_gross_sales_sevenue',payments.grossSalesRevenue);//总销售收入
            rec.setValue('custrecord_wal_refunded_retail_sales',payments.refundedRetailSales);//退还零售销售
            rec.setValue('custrecord_wal_sales_refund_for_escalati',payments.salesRefundForEscalation);//升级销售退款
            rec.setValue('custrecord_wal_gross_shipping_revenue',payments.grossShippingRevenue);//运输收入总和
            rec.setValue('custrecord_wal_gross_shipping_refunded',payments.grossShippingRefunded);//总运费退还
            rec.setValue('custrecord_wal_shipping_refund_for_escal',payments.shippingRefundForEscalation);//运费退回升级
            rec.setValue('custrecord_wal_net_shipping_revenue',payments.netShippingRevenue);//净运费收入
            rec.setValue('custrecord_wal_gross_fee_revenue',payments.grossFeeRevenue);//总费用收入
            rec.setValue('custrecord_wal_gross_fee_refunded',payments.grossFeeRefunded);//总费用退还
            rec.setValue('custrecord_wal_fee_efund_for_escalation',payments.FeeRefundForEscalation);//升级费用退款
            rec.setValue('custrecord_wal_net_fee_revenue',payments.netFeeRevenue);//净费用收入
            rec.setValue('custrecord_wal_gift_wrap_quantity',payments.giftWrapQuantity);//礼品包装数量
            rec.setValue('custrecord_wal_gross_gift_wrap_revenue',payments.grossGiftWrapRevenue);//礼品包装总收入
            rec.setValue('custrecord_wal_gross_gift_wrap_refunded',payments.grossGiftWrapRefunded);//礼品包装退款
            rec.setValue('custrecord_wal_gift_wrap_refund_for_esca',payments.giftWrapRefundForEscalation);//礼品包装升级退款
            rec.setValue('custrecord_wal_net_gift_wrap_revenue',payments.netGiftWrapRevenue);//净礼品包装收入
            rec.setValue('custrecord_wal_tax_onsales_revenue',payments.taxOnSalesRevenue);//销售收入税
            rec.setValue('custrecord_wal_tax_onshipping_revenue',payments.taxOnShippingRevenue);//运费收入税
            rec.setValue('custrecord_wal_tax_on_gift_wrap_revenue',payments.taxOnGiftWrapRevenue);//礼品包装收入税
            rec.setValue('custrecord_wal_tax_on_fee_revenue',payments.taxOnFeeRevenue);//费用收入税
            rec.setValue('custrecord_wal_effective_tax_rate',payments.effectiveTaxRate);//有效税率
            rec.setValue('custrecord_wal_tax_on_refunded_sales',payments.taxOnRefundedSales);//销售收入税退款
            rec.setValue('custrecord_wal_tax_on_shipping_refund',payments.taxOnShippingRefund);//费用收入税退款
            rec.setValue('custrecord_wal_tax_on_gift_wrap_refund',payments.taxOnGiftWrapRefund);//礼品包装收入税退款
            rec.setValue('custrecord_wal_tax_on_fee_refund',payments.taxOnFeeRefund);//费用收入税退款
            rec.setValue('custrecord_tax_sales_refund_escalation',payments.taxOnSalesRefundForEscalation);//升级销售收入税
            rec.setValue('custrecord_tax_ship_refund_escalation',payments.taxOnShippingRefundForEscalation);//升级运费收入税
            rec.setValue('custrecord_tax_giftwraprefund_escalation',payments.taxOnGiftWrapRefundForEscalation);//升级礼品包装收入税
            rec.setValue('custrecord_tax_on_fee_refund_escalation',payments.taxOnFeeRefundForEscalation);//升级费用收入税
            rec.setValue('custrecord_wal_total_net_tax_collected',payments.totalNETTaxCollected);//净税额
            rec.setValue('custrecord_wal_tax_withheld',payments.taxWithheld);//扣税金额
            rec.setValue('custrecord_wal_adjustment_description',payments.adjustmentDescription);//调整说明
            rec.setValue('custrecord_wal_adjustment_code',payments.adjustmentCode);//调整码
            rec.setValue('custrecord_wal_original_item_price',payments.originalItemPrice);//原价
            rec.setValue('custrecord_wal_original_commissionamount',payments.originalCommissionAmount);//原始佣金金额
            rec.setValue('custrecord_wal_spec_category',payments.specCategory);//规格类别
            rec.setValue('custrecord_wal_contract_category',payments.contractCategory);//合同类别
            rec.setValue('custrecord_wal_product_type',payments.productType);//产品类型
            rec.setValue('custrecord_wal_flex_commission_rule',payments.flexCommissionRule);//弹性佣金规则
            rec.setValue('custrecord_wal_return_reason_code',payments.returnReasonCode);//返回原因码
            rec.setValue('custrecord_wal_return_reason_description',payments.returnReasonDescription);//返回原因说明
            rec.setValue('custrecord_wal_fee_withheld_flag',payments.feeWithheldFlag);//费用预扣除
            rec.setValue('custrecord_wal_fulfillment_type',payments.fulfillmentType);//履行类型

            var recId = rec.save();

            return recId;
        }
        function getStore(storeId){
            var rec = record.load({
                type:'customrecord_cseg_hx_fm_store',
                id:storeId,
                isDynamic:true,
            });
            var plat = rec.getValue('cseg_hx_fm_platfm');//销售平台
            var currency = rec.getValue('custrecord_currency');//币种
            if(plat){
                return {"currency":currency,"platform":plat};
            }
        }
        function getSkuCorrelation(storeSku){
            var mysearch = search.create({
                type:'customrecord_hx_record_skucorrelation',
                filters:[['custrecord_hx_field_item_shopsku','is',storeSku]],
                columns:['custrecord_hx_field_item']
            });
            var res = mysearch.run().getRange({start: 0,end:1});
            if(res.length > 0){
                var nsSku = res[0].getValue('custrecord_hx_field_item');
                return nsSku;
            }
        }
        function getSo(po){
            var data = {};
            var mySearch = search.create({
                type:'salesorder',
                columns:['internalid'],
                filters:[[['custbody_hx_so_shoporder','is',po]]]
            });
            var res = mySearch.run().getRange({start: 0,end: 1000});
            for(var i = 0;i < res.length;i++){
                var soId = res[i].getValue('internalid');
                var rec = record.load({type:'salesorder',id:soId,isDynamic:true});
                var currency = rec.getValue('currency');
                var customer = rec.getValue('entity');
                data.soId = soId;
                data.currency = currency;
                data.customer = customer;
            }
            return data;
        }
        return {
            onRequest: onRequest
        };
    });