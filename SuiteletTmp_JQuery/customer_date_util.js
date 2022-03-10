/**
 * 提供日期处理公用方法
 *
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(
    ['N/format', 'N/http', 'N/search'],

    function (format, http, search) {


        /**
         * 获取该时区的时间
         *
         * @param timeZone：时区，东为正，西为负
         * @returns Date
         */
        function getDateByTimeZone(timeZone) {
            var d = new Date();
            var localTime = d.getTime();
            var localOffset = d.getTimezoneOffset() * 60000;
            var utc = localTime + localOffset;
            var offset = timeZone;
            var calctime = utc + (3600000 * offset);
            var nd = new Date(calctime);
            return nd;
        }



        return {
            getDateByTimeZone: getDateByTimeZone,

        };

    });
