/**
 * 2021/10/18：pu编码且去重，SPU生成规则为品牌+规格尺寸+类型（小类）+序列号
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
 define(['N/error','N/search','N/format','N/currentRecord','N/currency','N/record'],
 function(error,search,format,currentRecord,currencyRate,record) {
     function pageInit(context) {
        alert('pageinit');
     }
     function saveRecord(context) {
        var rec = context.currentRecord;
        var number = rec.getValue('custrecord_bsq_serial_number');//序列号，只能为两位数字
        if(number > 99){
            alert('序列号必须小于100,请检查序列号！！');
            return false;
        }
        else if(number == 0){
            alert('序列号不能为0或者为小数,请检查序列号！！');
            return false;
        }
        return true;
     }
     function getCode(params,rec_type) {
         if(params && rec_type){
             if(rec_type == 'custrecord_bsq_brand'){
                 return record.load({type:'customrecord_hl_brand',id:params,isDynamic:true}).getValue('custrecord_brand_abbreviation');
             }
         }
     }
     function getSpu(spu_code) {
        var mysearch = search.create({
            type:'customrecord_spu',
            filters:[['name','is',spu_code]],
        });
        var res = mysearch.run().getRange(0,1);
        if(res.length > 0){
            return 'N';
        }else{
            return 'Y';
        }
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
     function sublistChanged(context) {

     }
     return {
        //  pageInit: pageInit,
         // fieldChanged: fieldChanged,
         // postSourcing: postSourcing,
         // sublistChanged: sublistChanged,
         // lineInit: lineInit,
         // validateField: validateField,
         // validateLine: validateLine,
         // validateInsert: validateInsert,
         // validateDelete: validateDelete,
         saveRecord: saveRecord
     };
 });