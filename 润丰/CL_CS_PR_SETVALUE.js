/**
 * 请购单货品行赋值
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error', 'N/search', 'N/format', 'N/currentRecord', 'N/currency','N/record'],
    function (error, search, format, currentRecord, currencyRate,record) {
            function pageInit(context) {
                    var rec = context.currentRecord;
                    // var employee = rec.getValue('entity');
                    // log.debug('员工id',employee);
                    rec.setValue({ fieldId: 'subsidiary', value: 7});//睿凡国际股份有限公司
                    // log.debug('')
                    // if(getEmployee(employee)){
                    //         rec.setValue({fieldId:'department',value:getEmployee(employee) , ignoreFieldChange : true});
                    // }
            }
            function saveRecord(context) {

            }
            function validateField(context) {

            }
            function fieldChanged(context) {
                    try {
                            var rec = context.currentRecord;
                            var fieldId = context.fieldId;
                            log.debug('change fieldId',fieldId);
                            rec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'estimatedamount',
                                    value: '0.00',
                                    ignoreFieldChange: true,
                            });
                            rec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'amount',
                                    value: '0.00',
                                    ignoreFieldChange: true,
                            });
                            //  if (fieldId == 'item') {
                            //          var hl_sku = rec.getCurrentSublistValue({ sublistId: 'item', fieldId: fieldId });
                            //          var storeId = rec.getValue('cseg_hx_fm_store');
                            //          /**通过采购sku和销售店铺找到sku映射表*/
                            //          var salesperson_id = getSkuCorrelation(storeId, hl_sku);
                            //          rec.setValue({ fieldId: "custbody_rp_pm_salesperson", value: salesperson_id ? salesperson_id : '' });
                            //  }
                            if(fieldId == 'custcolcust_rf_inventory_id'){
                                    var itemId = rec.getCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: fieldId
                                    });
                                    log.debug('itemId', itemId);
                                    if (itemId) {
                                            var storeId = rec.getValue('cseg_hx_fm_store');
                                            log.debug('storeId',storeId);
                                            /**通过采购sku和销售店铺找到sku映射表*/
                                            var salesperson_id = getSkuCorrelation(storeId, itemId);
                                            rec.setValue({ fieldId: "custbody_rp_pm_salesperson", value: salesperson_id ? salesperson_id : '' });
                                            rec.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'item',
                                                    value: itemId,
                                                    ignoreFieldChange: true,
                                            });
                                            /**通过货品找到供应商地点*/
                                            var vendorname = search.lookupFields({
                                                    type: 'inventoryitem',
                                                    id: itemId,
                                                    columns: ['vendorname','custitem13','custitem_rp_md_item_productdescription'],
                                            });
                                            rec.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'estimatedamount',
                                                    value: '0.00',
                                                    ignoreFieldChange: true,
                                            });
                                            rec.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'amount',
                                                    value: '0.00',
                                                    ignoreFieldChange: true,
                                            });
                                            rec.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'vendorname',
                                                    value: vendorname.vendorname,
                                                    ignoreFieldChange: true,
                                            });
                                            rec.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'units',
                                                    value: '2',
                                                    ignoreFieldChange: true,
                                            });
                                            rec.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'description',
                                                    value: vendorname.custitem_rp_md_item_productdescription,
                                                    ignoreFieldChange: true,
                                            });
                                            var vendorSearch = search.create({
                                                    type: 'vendor',
                                                    columns: ['internalid', 'custentity9'],
                                                    filters: [['entityid', 'contains', vendorname.vendorname]]
                                            });
                                            var res = vendorSearch.run().getRange({ start: 0, end: 1 });
                                            log.debug('供应商数量', res.length);
                                            if (res.length > 0) {
                                                    var location = res[0].getValue('custentity9');
                                                    log.debug('location', location);
                                                    if (location) {
                                                            rec.setCurrentSublistValue({
                                                                    sublistId: 'item',
                                                                    fieldId: 'location',
                                                                    value: location,
                                                                    ignoreFieldChange: true,
                                                            });
                                                    }
                                            }
                                    }
                            }
                    } catch (e) {
                            log.debug('e', e)
                    }
            }
            function getEmployee(id){
                    var empRec = record.load({
                            type: 'employee',
                            id: id,
                            isDynamic: true,
                    });
                    var department = empRec.getValue('department');
                    if(department){
                            return department;
                    }
            }
            function getSkuCorrelation(storeId, sku) {
                    var yunying;
                    if (storeId) {
                            var mySearch = search.create({
                                    type: 'customrecord_hx_record_skucorrelation',
                                    filters: [['custrecord_hx_field_item_store', 'anyof', storeId], 'and', ['custrecord_hx_field_item', 'anyof', sku]],
                                    columns: ['custrecord_hx_field_item_saler']
                            });
                            var res = mySearch.run().getRange({ start: 0, end: 1 });
                            log.debug('sku映射表数量', res.length);
                            if (res.length > 0) {
                                    yunying = res[0].getValue('custrecord_hx_field_item_saler');
                            }
                    }
                    return yunying;
            }

            function postSourcing(context) {
                    var currentRec = context.currentRecord;
                    var sublistName = context.sublistId;
                    var sublistFieldName = context.fieldId;
                    log.debug('sublistName',sublistName);
                    if (sublistName == 'item') {
                            log.debug('sublistfieldname', sublistFieldName);
                            if (sublistFieldName == 'custcolcust_rf_inventory_id') {         //替换成申购货品字段 custcolcust_rf_inventory_id
                                    var itemId = currentRec.getCurrentSublistValue({
                                            sublistId: sublistName,
                                            fieldId: sublistFieldName
                                    });
                                    log.debug('itemId', itemId);
                                    if (itemId) {
                                            currentRec.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'item',
                                                    value: itemId,
                                                    ignoreFieldChange: true,
                                            });
                                            /**通过货品找到供应商地点*/
                                            var vendorname = search.lookupFields({
                                                    type: 'inventoryitem',
                                                    id: itemId,
                                                    columns: ['vendorname'],
                                            });
                                            var vendorSearch = search.create({
                                                    type: 'vendor',
                                                    columns: ['internalid', 'custentity9'],
                                                    filters: [['entityid', 'contains', vendorname.vendorname]]
                                            });
                                            var res = vendorSearch.run().getRange({ start: 0, end: 1 });
                                            log.debug('供应商数量', res.length);
                                            if (res.length > 0) {
                                                    var location = res[0].getValue('custentity9');
                                                    log.debug('location', location);
                                                    if (location) {
                                                            currentRec.setCurrentSublistValue({
                                                                    sublistId: 'item',
                                                                    fieldId: 'location',
                                                                    value: location,
                                                                    ignoreFieldChange: true,
                                                            });
                                                    }
                                            }
                                    }
                            }

                    }
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
                    pageInit: pageInit,
                    fieldChanged: fieldChanged,
                    //  postSourcing: postSourcing,
                    // sublistChanged: sublistChanged,
                    // lineInit: lineInit,
                    // validateField: validateField,
                    // validateLine: validateLine,
                    // validateInsert: validateInsert,
                    // validateDelete: validateDelete,
                    // saveRecord: saveRecord
            };
    });