/**
 * 
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['../utils/moment', 'N/ui/serverWidget'],
    function (moment, ui) {
        function onRequest(context) {
            try {
                var form = ui.createForm({
                    title: '头程月末结转报表操作'
                });
                form.clientScriptModulePath = './CL_CS_FIRST_PASS';
                form.addFieldGroup({
                    id: 'search_group',
                    label: '请选择月结时间'
                });
                var year = form.addField({
                    id: 'custpage_year',
                    type: ui.FieldType.SELECT,
                    label: '年',
                    container: 'search_group'
                });
                addYears(year);
                var month = form.addField({
                    id: 'custpage_month',
                    type: ui.FieldType.SELECT,
                    label: '月',
                    container: 'search_group'
                });
                addMonth(month);
                // form.addField({
                //     id: 'custpage_item',
                //     type: ui.FieldType.SELECT,
                //     label: '产品',
                //     source: 'item',
                //     container: 'search_group'
                // });
                form.addButton({
                    id: 'custpage_submit',
                    label: '提交',
                    functionName: 'submitJournal'
                });
                context.response.writePage(form);
            } catch (e) {
                log.debug('e', e);
            }
        }

        function addYears(year) {
            var need_time = moment(new Date(), 'YYYY');
            var last_time = need_time.add(-1, 'year');
            year.addSelectOption({
                value: last_time.format('YYYY'),
                text: last_time.format('YYYY')
            });
            var time = moment(new Date(), 'YYYY');
            for (var i = 0; i < 10; i++) {
                var m = time.format('YYYY');
                year.addSelectOption({
                    value: m,
                    text: m
                });
                time.add(1, 'year');
            }
            year.defaultValue = moment(new Date()).format('YYYY');
        }

        function addMonth(month) {
            for (var i = 1; i <= 12; i++) {
                month.addSelectOption({
                    value: i,
                    text: i
                });
            }
            month.defaultValue = moment(new Date()).format('MM');
        }


        return {

            onRequest: onRequest
        };
    });