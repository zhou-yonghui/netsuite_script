/**
 *采购订单赋值shipment默认仓库
 *点击创建CS质检跳转到CS质检结果页面
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/search','N/https'],
    function(record,search,https) {
        function beforeLoad(context) {
            try {
                var status = context.newRecord.getValue("custbody_cs_zjlrqk_entity");//质检录入情况,1 未开始
                var poId = context.newRecord.id;
                if (context.type == 'view' && status == 1) {
                    var formObj = context.form;
                    formObj.clientScriptFileId = 512; //
                    var soFlag = 0;
                    var mySearch = search.create({
                        type: 'customrecord_cs_zj_detail',
                        columns: [
                            'internalid'
                        ],
                        filters:[
                            ['custrecord_cs_cgdd_record','is',poId]
                        ]
                    });
                    if(mySearch.run().getRange({start:0,end:100}).length > 0){
                        log.debug('soFlag=1');
                        soFlag = 1;
                    }
                    if(soFlag != 1){
                        formObj.addButton({
                            id: 'custpage_print1',
                            label: '创建CS质检',
                            functionName: "PurchaseOrderToZJ(" + context.newRecord.id + ")"
                        });
                    }
                }
            } catch (error) {
                log.debug('ERROR', error);
            }
        }
        function beforeSubmit(context) {
            if(context.type == 'create' || context.type == 'edit'){   //测试加编辑条件下触发脚本
                var rec = context.newRecord;
                var shipmentId = rec.getValue('custbody_shipment_id');
                var location = getStoreLocation(shipmentId);
                rec.setValue({fieldId:'custbody_cs_sp_shck',value:location});
                rec.save();
            }
        }
        function getStoreLocation(shipmentId){
            var mysearch = search.create({
                type:'customrecord_inbound_shipment_info',
                columns:['custrecord_shipment_store_id'],
                filters:[['custrecord_shipment_id','is',shipmentId]]
            });
            var res = mysearch.run().getRange({start: 0,end: 1});
            if(res.length > 0){
                var storeId = res[0].getValue('custrecord_shipment_store_id');
                var storeRec = record.load({type:'customrecord_cseg_hx_fm_store',id:storeId});
                var location = storeRec.getValue('custrecord_hx_md_warehouse');//默认仓库
                return location;
            }
        }
        function afterSubmit(context) {

        }
        return {
            // beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            // afterSubmit: afterSubmit
        };
    });
