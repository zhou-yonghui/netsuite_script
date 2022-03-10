/**
 * @LastEditors: zhouyh
 * @LastEditTime: 2022-01-14 14:06:09
 * @Description: 退款明细
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
    function(error,search,format,currentRecord,currencyRate,record) {
        function pageInit(context) {

        }
        function saveRecord(context) {
            var rec = context.currentRecord;
            var tk_now = rec.getValue('custrecord_refund_amount');
            var dk_id = rec.getValue('custrecordassociate_payment_notice');
            if(dk_id){
                    var dkData = getDktz(dk_id);
                    var old_a;
                    if(dkData){
                            if(!dkData.so){
                                    alert('到款通知没有销售订单不能创建退款');
                                    return false;
                            }
                            else if(!dkData.dk){
                                    alert('到款通知没有到款不能退款');
                                    return false;
                            }
                            // else if(dkData.dk){
                            //         alert(context.type);
                            //         if(context.type == 'create'){
                            //                 old_a = getTkAll(dk_id,'create');
                            //         }
                            //         else if(context.type == 'edit'){
                            //                 old_a = getTkAll(dk_id,'edit',rec.id);
                            //         }
                            //         if(old_a){
                            //                 tk_now = Number(old_a) + Number(tk_now);
                            //         }
                            //         if(Number(dkData.dk) < tk_now){
                            //                 alert('退款总额不能大于到款总额');
                            //                 return false;
                            //         }
                            // }
                    }
            }
            return true;
        }
        function getDktz(id){
                if(id){
                        var dkRec = record.load({
                                type:'customrecord_sl_dktz_list',
                                id:id,
                                isDynamic:true,
                        });

                        return {
                                "so" : dkRec.getValue('custrecord_sl_xsdd'),
                                "dk" : dkRec.getValue('custrecord_sl_dkje'),
                        }
                }
        }
            function getTkAll(dk_id,flag,id){
                    var sum = Number(0);
                    if(dk_id){
                            var mysearch;
                            if(flag == 'create'){
                                    mysearch = search.create({
                                            type:'customrecord_refund_amount_details',
                                            filters:[
                                                    ['custrecordassociate_payment_notice','anyof',dk_id]
                                            ],
                                            columns:[
                                                    'custrecord_refund_amount',    //退款金额
                                            ]
                                    });
                            }
                            // else if(flag == 'edit'){
                            //         mysearch = search.create({
                            //                 type:'customrecord_refund_amount_details',
                            //                 filters:[
                            //                         ['custrecordassociate_payment_notice','anyof',dk_id],
                            //                         'AND',['internalid','noneof',id]
                            //                 ],
                            //                 columns:[
                            //                         'custrecord_refund_amount',    //退款金额
                            //                 ]
                            //         });
                            // }
                            var res = mysearch.run().getRange(0,1000);
                            if(res.length > 0){
                                    for(var i = 0;i < res.length;i++){
                                            sum += Number(res[i].getValue('custrecord_refund_amount'));
                                    }
                            }
                    }
                    log.debug('sum',sum);
                    return sum;
            }
        function validateField(context) {

        }
        function fieldChanged(context) {

        }
        function postSourcing(context) {

        }
        function lineInit(context) {

        }
        function validateDelete(context) {

        }
        function validateInsert(context) {

        }
        function validateLine(context) {

        }
        return {
            //  pageInit: pageInit,
            // fieldChanged: fieldChanged,
            // postSourcing: postSourcing,
            //  sublistChanged: sublistChanged,
            // lineInit: lineInit,
            // validateField: validateField,
            //  validateLine: validateLine,
            // validateInsert: validateInsert,
            // validateDelete: validateDelete,
            saveRecord: saveRecord
        };
    });