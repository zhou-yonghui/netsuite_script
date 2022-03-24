/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/runtime", "../utils/moment", "N/search", "N/record"], (
  runtime,
  moment,
  search,
  record
) => {
  //合并子公司（测试环境）
  //1   母公司
  //20  母公司 : 深圳市倍思奇创新科技有限公司
  //23  母公司 : 倍思奇创新（香港）科技有限公司
  //24  母公司 : 倍思奇创新（香港）科技有限公司 : BESTERGO Inc.
  //25  母公司 : 倍思奇创新（香港）科技有限公司 : 香港抵销公司
  //26  母公司 : 深圳抵销公司

  //合并子公司（正式环境）
  //1	母公司
  //2	深圳市倍思奇创新科技有限公司
  //3	深圳抵销公司
  //4	倍思奇创新（香港）科技有限公司
  //8	美国公司
  //9	香港抵销公司

  //合并子公司（当前值）
  var szSubsidiaryID = 1; //母公司
  var hkSubsidiaryID = 9; //香港抵销公司

  function customrecord_unrealized_profit(
    subsidiary,
    year,
    month,
    item,
    currentrate
  ) {
    this.custrecord_subsidiary = subsidiary; //合并子公司（列表/记录）附属公司
    this.custrecord_year = year; //年（Free-Form文本）
    this.custrecord_month = month; //月（Free-Form文本）
    this.custrecord_item = item; //货品（列表/记录）货品
    this.custrecord_opening_external_po_quantity = 0; //期初外部采购数量（整数）
    this.custrecord_opening_external_po_amount = 0.0; //期初外部采购金额（货币）
    this.custrecord_opening_external_po_price = 0.0; //期初外部采购单价（货币）
    this.custrecord_current_ex_po_quantity = 0; //本期外部采购数量（整数）
    this.custrecord_current_ex_po_amount = 0.0; //本期外部采购金额（货币）
    this.custrecord_current_ex_po_price = 0.0; //本期外部采购单价（货币）
    this.custrecord_available_ex_po_quantity = 0; //本期可用外部采购数量（整数）
    this.custrecord_availiable_ex_po_amount = 0.0; //本期可用外部采购金额（货币）
    this.custrecord_avaliable_ex_po_price = 0.0; //本期可用外部采购单价（货币）
    this.custrecord_current_ex_so_quantity = 0; //本期外部销售数量（整数）
    this.custrecord_current_ex_so_cost = 0.0; //本期外部销售系统结转成本（货币）
    this.custrecord_closing_ex_po_quantity = 0; //期末外部采购结余数量（整数）
    this.custrecord_closing_ex_po_amount = 0.0; //期末外部采购结余金额（货币）
    this.custrecord_closing_ex_po_price = 0.0; //期末外部采购结余单价（货币）
    this.custrecord_opening_in_po_quantity = 0; //期初内部采购数量（整数）
    this.custrecord_opening_in_purchase_cost = 0.0; //期初内部采购实际成本金额（货币）
    this.custrecord_opening_in_po_addamount = 0.0; //期初内部采购加成成本金额（货币）
    this.currentrate = currentrate; //合并汇率-当前汇率（仅用于计算）
    this.custrecord_current_in_po_quantity = 0; //本期内部采购数量（整数）
    this.custrecord_current_in_po_purchase_cost = 0.0; //本期内部采购实际成本金额（货币）
    this.custrecord_current_in_po_addamount = 0.0; //本期内部采购加成成本金额（货币）
    this.custrecord_cumulative_in_po_quantity = 0; //本期累计内部采购数量（整数）
    this.custrecord_cumulative_in_po_purchasecost = 0.0; //本期累计内部采购实际成本金额（货币）
    this.custrecord_cumulative_in_po_addamount = 0.0; //本期累计内部采购加成成本金额（货币）
    this.custrecord_current_realized_profit = 0.0; //本期已实现内部损益（货币）
    this.custrecord_cumulative_unrealized_profit = 0.0; //截至本期未实现内部损益（货币）
    this.custrecord_cumulative_realized_profit = 0.0; //截至本期累计已实现内部损益（货币）
    this.custrecord_opening_realized_profit = 0.0; //期初截至本期累计已实现内部损益（仅用于计算）
  }

  //收集
  const getInputData = (inputContext) => {
    var periodTime = getPeriodTime();

    var szMerge = getSearchDatas(
      periodTime,
      szSubsidiaryID,
      "customsearch_szmerge_exter_po",
      "customsearch_szmerge_exter_so",
      "customsearch_szmerge_inter_po"
    );
    if (!szMerge) {
      szMerge = [];
    }
    log.debug("szMerge.length", szMerge ? 0 : szMerge.length);

    var hkMerge = getSearchDatas(
      periodTime,
      hkSubsidiaryID,
      "customsearch_hkmerge_exter_po",
      "customsearch_hkmerge_exter_so",
      "customsearch_hkmerge_inter_po"
    );
    if (!hkMerge) {
      hkMerge = [];
    }
    log.debug("hkMerge.length", hkMerge.length);

    var allMerge = szMerge.concat(hkMerge);

    //历遍\分类\汇总
    allMergeProcess(allMerge);

    //return allMerge
    return [];
  };

  function getPeriodTime() {
    //接收输入
    var currentScript = runtime.getCurrentScript();
    var submit_year = currentScript.getParameter({
      name: "custscript_submit_year",
    });
    var submit_month = currentScript.getParameter({
      name: "custscript_submit_month",
    });

    //计算日期
    var currentUser = runtime.getCurrentUser();
    var dateFormat = currentUser.getPreference("DATEFORMAT");
    var monthSelected = moment(submit_year + submit_month, "YYYYMM");
    var startOfMonthObject = moment(monthSelected);
    startOfMonthObject.startOf("month");
    startOfMonth = startOfMonthObject.format(dateFormat);
    var endOfMonthObject = moment(monthSelected);
    endOfMonthObject.endOf("month");
    endOfMonth = endOfMonthObject.format(dateFormat);

    //返回期间
    return (function () {
      return { submit_year, submit_month, startOfMonth, endOfMonth };
    })();
  }

  var dateFieldID = "trandate";
  function getSearchQuery(searchName, periodTime) {
    var searchQuery = search.load({
      id: searchName,
    });

    //修改日期范围
    var fieldIndex = 0;
    var fieldFind = false;
    for (; fieldIndex < searchQuery.filters.length; fieldIndex++) {
      if (searchQuery.filters[fieldIndex].name == dateFieldID) {
        fieldFind = true;
        break;
      }
    }

    //构建搜索条件
    var fieldFilter = search.createFilter({
      name: dateFieldID,
      operator: search.Operator.WITHIN,
      values: [periodTime.startOfMonth, periodTime.endOfMonth],
    });
    if (fieldFind) {
      searchQuery.filters.splice(fieldIndex, 1, fieldFilter);
    } else {
      searchQuery.filters.push(fieldFilter);
    }

    //返回搜索方案
    return searchQuery;
  }

  function getSearchDatas(
    periodTime,
    subsidiary,
    search_exter_po,
    search_exter_so,
    search_inter_po
  ) {
    var logTitle =
      "机构【" + subsidiary + "】期间【" + periodTime.startOfMonth + "】";
    var resultData = [];
    //(v2)合并汇率
    var currentrate = 1.0;
    var currentrateCount = 0;
    if (subsidiary == szSubsidiaryID) {
      var exchangeRateSearch = search.create({
        type: "ConsolidatedExchangeRate",
        filters: [
          [
            "periodstartdate",
            "within",
            periodTime.startOfMonth,
            periodTime.startOfMonth, //(v3)endOfMonth v3排除调整财政年度
          ],
          "AND",
          ["fromsubsidiary", "is", hkSubsidiaryID],
          "AND",
          ["tosubsidiary", "is", szSubsidiaryID],
        ],
        columns: ["currentrate"],
      });
      //var ers = ""; //(v3)排查汇率出现行
      var exchangeRateSearchResult = exchangeRateSearch.runPaged();
      exchangeRateSearchResult.pageRanges.forEach(function (pageRange) {
        var page = exchangeRateSearchResult.fetch({ index: pageRange.index });
        page.data.forEach(function (result) {
          // var erRecord = record.load({ type: "ConsolidatedExchangeRate", id: result.id });
          // ers += JSON.stringify(erRecord);
          currentrateCount++;
          var currentrateString = result.getValue("currentrate");
          currentrate = parseFloat(currentrateString);
          if (isNaN(currentrate)) {
            throw (
              "合并汇率" +
              periodTime.startOfMonth +
              "~" +
              periodTime.endOfMonth +
              "的值" +
              currentrateString +
              "不是数值"
            );
            return;
          }
        });
      });
      if (currentrateCount > 1) {
        throw (
          "合并汇率" +
          periodTime.startOfMonth +
          "~" +
          periodTime.endOfMonth +
          "的行数" +
          currentrateCount +
          "大于1"
          //+ ers
        );
        return;
      }
    }
    log.debug("合并汇率", logTitle + " " + currentrate);

    //0/4 总参
    var resultRangeStep = 1000;

    //1/4 期初
    var currentStartDate = new Date(periodTime.startOfMonth);
    var openingEndDate = new Date(
      currentStartDate.setDate(currentStartDate.getDate() - 1)
    );
    var openingSearch = search.create({
      type: "customrecord_unrealized_profit",
      filters: [
        ["custrecord_subsidiary", "is", subsidiary],
        "AND",
        ["custrecord_year", "is", openingEndDate.getUTCFullYear().toString()],
        "AND",
        [
          "custrecord_month",
          "is",
          (openingEndDate.getUTCMonth() + 1).toString(),
        ],
      ],
      columns: [
        "custrecord_item",
        "custrecord_closing_ex_po_quantity",
        "custrecord_closing_ex_po_amount",
        "custrecord_closing_ex_po_price",
        "custrecord_cumulative_in_po_quantity",
        "custrecord_cumulative_in_po_purchasecost",
        "custrecord_cumulative_in_po_addamount",
        "custrecord_cumulative_realized_profit",
      ],
    });
    //log.debug("1/4期初-查询条件", openingSearch);
    var openingSearchResultCount = openingSearch.runPaged().count;
    log.debug("1/4期初-结果行数", logTitle + " " + openingSearchResultCount);
    var resultStart = 0;
    do {
      if (resultStart >= openingSearchResultCount) {
        break;
      }
      log.debug(
        "1/4期初-行读取",
        logTitle +
          " " +
          resultStart +
          "~" +
          (resultStart + resultRangeStep) +
          "/" +
          openingSearchResultCount
      );
      var results = openingSearch.run().getRange({
        start: resultStart,
        end: resultStart + resultRangeStep,
      });
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var inpRecord = new customrecord_unrealized_profit(
          subsidiary,
          periodTime.submit_year,
          periodTime.submit_month,
          result.getValue({ name: "custrecord_item" }),
          currentrate
        );
        inpRecord.custrecord_opening_external_po_quantity = parseInt(
          result.getValue({ name: "custrecord_closing_ex_po_quantity" })
        );
        inpRecord.custrecord_opening_external_po_amount = parseFloat(
          result.getValue({ name: "custrecord_closing_ex_po_amount" })
        );
        inpRecord.custrecord_opening_external_po_price = parseFloat(
          result.getValue({ name: "custrecord_closing_ex_po_price" })
        );
        inpRecord.custrecord_opening_in_po_quantity = parseInt(
          result.getValue({ name: "custrecord_cumulative_in_po_quantity" })
        );
        inpRecord.custrecord_opening_in_purchase_cost = parseFloat(
          result.getValue({ name: "custrecord_cumulative_in_po_purchasecost" })
        );
        inpRecord.custrecord_opening_in_po_addamount = parseFloat(
          result.getValue({ name: "custrecord_cumulative_in_po_addamount" })
        );
        inpRecord.custrecord_opening_realized_profit = parseFloat(
          result.getValue({ name: "custrecord_cumulative_realized_profit" })
        );
        resultData.push(inpRecord);
      }
      resultStart += resultRangeStep;
    } while (results.length > 0);

    //2/4 外部采购-本期
    var exterPOSearch = getSearchQuery(search_exter_po, periodTime);
    var exterPOResultCount = exterPOSearch.runPaged().count;
    log.debug("2/4外部采购-本期-行数", logTitle + " " + exterPOResultCount);
    var resultStart = 0;
    do {
      if (resultStart >= exterPOResultCount) {
        break;
      }
      log.debug(
        "2/4外部采购-本期-行读取",
        logTitle +
          " " +
          resultStart +
          "~" +
          (resultStart + resultRangeStep) +
          "/" +
          exterPOResultCount
      );
      var results = exterPOSearch.run().getRange({
        start: resultStart,
        end: resultStart + resultRangeStep,
      });
      //log.debug(`results[${i}].columns`, result.columns); //检查定义
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        //log.debug(`results[${i}]`, result);                 //检查实例

        // var trandate = new Date(result.getValue({ name: dateFieldID })); //(v1)明细行
        //(v2)汇总行
        var trandate = period2date(
          result.getText({
            name: "postingperiod",
            summary: search.Summary.GROUP,
          })
        );
        var inpRecord = new customrecord_unrealized_profit(
          subsidiary,
          trandate.getUTCFullYear(),
          trandate.getUTCMonth() + 1,
          result.getValue({ name: "item", summary: search.Summary.GROUP }),
          currentrate
        );
        var custrecord_current_ex_po_quantity = parseInt(
          result.getValue({
            name: "quantity",
            summary: search.Summary.SUM,
          })
        );
        if (isNaN(custrecord_current_ex_po_quantity)) {
          custrecord_current_ex_po_quantity = 0;
        }
        var custrecord_current_ex_po_amount = parseFloat(
          result.getValue({
            name: "amount",
            summary: search.Summary.SUM,
          })
        );
        if (isNaN(custrecord_current_ex_po_amount)) {
          custrecord_current_ex_po_amount = 0.0;
        }
        inpRecord.custrecord_current_ex_po_quantity =
          custrecord_current_ex_po_quantity;
        inpRecord.custrecord_current_ex_po_amount =
          custrecord_current_ex_po_amount;
        resultData.push(inpRecord);
      }
      resultStart += resultRangeStep;
    } while (results.length > 0);

    //3/4 外部销售-本期
    var exterSOSearch = getSearchQuery(search_exter_so, periodTime);
    var exterSOResultCount = exterSOSearch.runPaged().count;
    log.debug("3/4外部销售-本期-行数", logTitle + " " + exterSOResultCount);
    var resultStart = 0;
    do {
      if (resultStart >= exterSOResultCount) {
        break;
      }
      log.debug(
        "3/4外部销售-本期-行读取",
        logTitle +
          " " +
          resultStart +
          "~" +
          (resultStart + resultRangeStep) +
          "/" +
          exterSOResultCount
      );
      var results = exterSOSearch.run().getRange({
        start: resultStart,
        end: resultStart + resultRangeStep,
      });
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        //var trandate = new Date(result.getValue({ name: dateFieldID }));
        var trandate = period2date(
          result.getText({
            name: "postingperiod",
            summary: search.Summary.GROUP,
          })
        );
        var inpRecord = new customrecord_unrealized_profit(
          subsidiary,
          trandate.getUTCFullYear(),
          trandate.getUTCMonth() + 1,
          result.getValue({ name: "item", summary: search.Summary.GROUP }),
          currentrate
        );
        var custrecord_current_ex_so_quantity = parseInt(
          result.getValue({
            name: "quantity",
            summary: search.Summary.SUM,
          })
        );
        if (isNaN(custrecord_current_ex_so_quantity)) {
          custrecord_current_ex_so_quantity = 0;
        }
        var custrecord_current_ex_so_cost = parseFloat(
          result.getValue({
            name: "amount",
            summary: search.Summary.SUM,
          })
        );
        if (isNaN(custrecord_current_ex_so_cost)) {
          custrecord_current_ex_so_cost = 0.0;
        }
        inpRecord.custrecord_current_ex_so_quantity =
          custrecord_current_ex_so_quantity;
        inpRecord.custrecord_current_ex_so_cost = custrecord_current_ex_so_cost;
        resultData.push(inpRecord);
      }
      resultStart += resultRangeStep;
    } while (results.length > 0);

    //4/4 内部采购-本期
    var interPOSearch = getSearchQuery(search_inter_po, periodTime);
    var interPOResultCount = interPOSearch.runPaged().count;
    log.debug("4/4内部采购-本期-行数", logTitle + " " + interPOResultCount);
    var resultStart = 0;
    do {
      if (resultStart >= interPOResultCount) {
        break;
      }
      log.debug(
        "4/4内部采购-本期-行读取",
        logTitle +
          " " +
          resultStart +
          "~" +
          (resultStart + resultRangeStep) +
          "/" +
          interPOResultCount
      );
      var results = interPOSearch.run().getRange({
        start: resultStart,
        end: resultStart + resultRangeStep,
      });
      log.debug(`results[${i}].columns`, result.columns); //检查定义
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        //log.debug(`results[${i}]`, result); //检查实例
        //var trandate = new Date(result.getValue({ name: dateFieldID }));
        var trandate = period2date(
          result.getText({
            name: "postingperiod",
            summary: search.Summary.GROUP,
          })
        );
        var inpRecord = new customrecord_unrealized_profit(
          subsidiary,
          trandate.getUTCFullYear(),
          trandate.getUTCMonth() + 1,
          result.getValue({ name: "item", summary: search.Summary.GROUP }),
          currentrate
        );
        var custrecord_current_in_po_quantity = parseInt(
          result.getValue({
            name: "quantity",
            summary: search.Summary.SUM,
          })
        );
        if (isNaN(custrecord_current_in_po_quantity)) {
          custrecord_current_in_po_quantity = 0;
        }
        var custrecord_current_in_po_purchase_cost = parseFloat(
          result.getValue({
            name: "custcol_baseprice2",
            summary: search.Summary.SUM,
          })
        );
        if (isNaN(custrecord_current_in_po_purchase_cost)) {
          custrecord_current_in_po_purchase_cost = 0.0;
        }
        var custrecord_current_in_po_addamount = parseFloat(
          result.getValue({
            name: "custcol_overprice2",
            summary: search.Summary.SUM,
          })
        );
        if (isNaN(custrecord_current_in_po_addamount)) {
          custrecord_current_in_po_addamount = 0.0;
        }
        inpRecord.custrecord_current_in_po_quantity =
          custrecord_current_in_po_quantity;
        inpRecord.custrecord_current_in_po_purchase_cost =
          custrecord_current_in_po_purchase_cost;
        inpRecord.custrecord_current_in_po_addamount =
          custrecord_current_in_po_addamount;
        resultData.push(inpRecord);
      }
      resultStart += resultRangeStep;
    } while (results.length > 0);

    return resultData;
  }

  function period2date(periodText) {
    return new Date(periodText.replace("年度", "-").replace("月", "") + "-1");
  }

  function allMergeProcess(allMerge) {
    // 1/3 分类
    var maps = {};
    allMerge.forEach((item) => {
      var itemKey = item.custrecord_subsidiary + "," + item.custrecord_item;
      maps[itemKey] = maps[itemKey] || [];
      maps[itemKey].push(item);
    });

    //2/3 合并
    var reduces = [];
    Object.keys(maps).forEach((itemKey) => {
      var items = maps[itemKey];
      var reduceRecord = null;
      items.forEach((mapRecord) => {
        if (reduceRecord == null) {
          reduceRecord = new customrecord_unrealized_profit(
            mapRecord.custrecord_subsidiary,
            mapRecord.custrecord_year,
            mapRecord.custrecord_month,
            mapRecord.custrecord_item,
            mapRecord.currentrate
          );
        }
        reduceRecord.custrecord_opening_external_po_quantity +=
          mapRecord.custrecord_opening_external_po_quantity;
        reduceRecord.custrecord_opening_external_po_amount +=
          mapRecord.custrecord_opening_external_po_amount;
        reduceRecord.custrecord_opening_external_po_price +=
          mapRecord.custrecord_opening_external_po_price;
        reduceRecord.custrecord_current_ex_po_quantity +=
          mapRecord.custrecord_current_ex_po_quantity;
        reduceRecord.custrecord_current_ex_po_amount +=
          mapRecord.custrecord_current_ex_po_amount;
        reduceRecord.custrecord_current_ex_po_price +=
          mapRecord.custrecord_current_ex_po_price;
        reduceRecord.custrecord_available_ex_po_quantity +=
          mapRecord.custrecord_available_ex_po_quantity;
        reduceRecord.custrecord_availiable_ex_po_amount +=
          mapRecord.custrecord_availiable_ex_po_amount;
        reduceRecord.custrecord_avaliable_ex_po_price +=
          mapRecord.custrecord_avaliable_ex_po_price;
        reduceRecord.custrecord_current_ex_so_quantity +=
          mapRecord.custrecord_current_ex_so_quantity;
        reduceRecord.custrecord_current_ex_so_cost +=
          mapRecord.custrecord_current_ex_so_cost;
        reduceRecord.custrecord_closing_ex_po_quantity +=
          mapRecord.custrecord_closing_ex_po_quantity;
        reduceRecord.custrecord_closing_ex_po_amount +=
          mapRecord.custrecord_closing_ex_po_amount;
        reduceRecord.custrecord_closing_ex_po_price +=
          mapRecord.custrecord_closing_ex_po_price;
        reduceRecord.custrecord_opening_in_po_quantity +=
          mapRecord.custrecord_opening_in_po_quantity;
        reduceRecord.custrecord_opening_in_purchase_cost +=
          mapRecord.custrecord_opening_in_purchase_cost;
        reduceRecord.custrecord_opening_in_po_addamount +=
          mapRecord.custrecord_opening_in_po_addamount;
        reduceRecord.custrecord_current_in_po_quantity +=
          mapRecord.custrecord_current_in_po_quantity;
        reduceRecord.custrecord_current_in_po_purchase_cost +=
          mapRecord.custrecord_current_in_po_purchase_cost;
        reduceRecord.custrecord_current_in_po_addamount +=
          mapRecord.custrecord_current_in_po_addamount;
        reduceRecord.custrecord_cumulative_in_po_quantity +=
          mapRecord.custrecord_cumulative_in_po_quantity;
        reduceRecord.custrecord_cumulative_in_po_purchasecost +=
          mapRecord.custrecord_cumulative_in_po_purchasecost;
        reduceRecord.custrecord_cumulative_in_po_addamount +=
          mapRecord.custrecord_cumulative_in_po_addamount;
        reduceRecord.custrecord_current_realized_profit +=
          mapRecord.custrecord_current_realized_profit;
        reduceRecord.custrecord_cumulative_unrealized_profit +=
          mapRecord.custrecord_cumulative_unrealized_profit;
        reduceRecord.custrecord_cumulative_realized_profit +=
          mapRecord.custrecord_cumulative_realized_profit;
        reduceRecord.custrecord_opening_realized_profit +=
          mapRecord.custrecord_opening_realized_profit;
      });
      reduces.push(reduceRecord);
    });

    //3/3 汇总
    log.debug(`报告总行数：${reduces.length}`);
    reduces.forEach((reduceRecord) => {
      var sumRecord = record.create({
        type: "customrecord_unrealized_profit",
      });
      //分类项
      sumRecord.setValue({
        fieldId: "custrecord_subsidiary",
        value: reduceRecord.custrecord_subsidiary,
      });
      sumRecord.setValue({
        fieldId: "custrecord_year",
        value: reduceRecord.custrecord_year,
      });
      sumRecord.setValue({
        fieldId: "custrecord_month",
        value: reduceRecord.custrecord_month,
      });
      sumRecord.setValue({
        fieldId: "custrecord_item",
        value: reduceRecord.custrecord_item,
      });
      //外部采购-期初外部采购结余
      sumRecord.setValue({
        fieldId: "custrecord_opening_external_po_quantity", //期初外部采购数量（整数）
        value: reduceRecord.custrecord_opening_external_po_quantity,
      });
      sumRecord.setValue({
        fieldId: "custrecord_opening_external_po_amount", //期初外部采购金额（货币）
        value: reduceRecord.custrecord_opening_external_po_amount,
      });
      sumRecord.setValue({
        fieldId: "custrecord_opening_external_po_price", //期初外部采购单价（货币）
        value: reduceRecord.custrecord_opening_external_po_price,
      });
      //外部采购-本期外部采购
      sumRecord.setValue({
        fieldId: "custrecord_current_ex_po_quantity", //本期外部采购数量（整数）
        value: reduceRecord.custrecord_current_ex_po_quantity,
      });
      sumRecord.setValue({
        fieldId: "custrecord_current_ex_po_amount", //本期外部采购金额（货币）
        value: reduceRecord.custrecord_current_ex_po_amount,
      });
      var custrecord_current_ex_po_price =
        reduceRecord.custrecord_current_ex_po_quantity == 0
          ? 0
          : reduceRecord.custrecord_current_ex_po_amount /
            reduceRecord.custrecord_current_ex_po_quantity;
      sumRecord.setValue({
        fieldId: "custrecord_current_ex_po_price", //本期外部采购单价（货币）  =本期外部采购金额/本期外部采购数量
        value: custrecord_current_ex_po_price,
      });
      //外部采购-本期合计外部采购
      var custrecord_available_ex_po_quantity =
        reduceRecord.custrecord_opening_external_po_quantity +
        reduceRecord.custrecord_current_ex_po_quantity;
      sumRecord.setValue({
        fieldId: "custrecord_available_ex_po_quantity", //本期可用外部采购数量（整数）  =期初数量+本期外部采购数量
        value: custrecord_available_ex_po_quantity,
      });
      var custrecord_availiable_ex_po_amount =
        reduceRecord.custrecord_opening_external_po_amount +
        reduceRecord.custrecord_current_ex_po_amount;
      sumRecord.setValue({
        fieldId: "custrecord_availiable_ex_po_amount", //本期可用外部采购金额（货币） =期初外部采购金额+本期外部采购金额
        value: custrecord_availiable_ex_po_amount,
      });
      var custrecord_avaliable_ex_po_price =
        custrecord_available_ex_po_quantity == 0
          ? 0
          : custrecord_availiable_ex_po_amount /
            custrecord_available_ex_po_quantity;
      sumRecord.setValue({
        fieldId: "custrecord_avaliable_ex_po_price", //本期可用外部采购单价（货币）  =本期可用外部采购金额/本期可用外部采购数量
        value: custrecord_avaliable_ex_po_price,
      });
      //外部销售-本期对外销售数据
      sumRecord.setValue({
        fieldId: "custrecord_current_ex_so_quantity", //本期外部销售数量（整数）
        value: reduceRecord.custrecord_current_ex_so_quantity,
      });
      sumRecord.setValue({
        fieldId: "custrecord_current_ex_so_cost", //本期外部销售系统结转成本（货币）
        value: reduceRecord.custrecord_current_ex_so_cost,
      });
      //期末外部采购结余数据-期末外部采购结余数据
      var custrecord_closing_ex_po_quantity =
        custrecord_available_ex_po_quantity +
        reduceRecord.custrecord_current_ex_so_quantity;
      sumRecord.setValue({
        fieldId: "custrecord_closing_ex_po_quantity", //期末外部采购结余数量（整数） =(v1)本期外部采购数量+本期外部销售数量；(v2)本期可用外部采购数量+本期外部销售数量
        value: custrecord_closing_ex_po_quantity,
      });
      var custrecord_closing_ex_po_amount =
        custrecord_closing_ex_po_quantity * custrecord_current_ex_po_price;
      sumRecord.setValue({
        fieldId: "custrecord_closing_ex_po_amount", //期末外部采购结余金额（货币） =期末外部采购结余数量*本期采购单价
        value: custrecord_closing_ex_po_amount,
      });
      sumRecord.setValue({
        fieldId: "custrecord_closing_ex_po_price", //期末外部采购结余单价（货币） =期末外部采购结余金额/期末外部采购结余数量
        value:
          custrecord_closing_ex_po_quantity == 0
            ? 0
            : custrecord_closing_ex_po_amount /
              custrecord_closing_ex_po_quantity,
      });
      //内部采购数据-期初内部采购累计结余
      sumRecord.setValue({
        fieldId: "custrecord_opening_in_po_quantity", //期初内部采购数量（整数）
        value: reduceRecord.custrecord_opening_in_po_quantity,
      });
      sumRecord.setValue({
        fieldId: "custrecord_opening_in_purchase_cost", //期初内部采购实际成本金额（货币）
        value: reduceRecord.custrecord_opening_in_purchase_cost,
      });
      sumRecord.setValue({
        fieldId: "custrecord_opening_in_po_addamount", //期初内部采购加成成本金额（货币）
        value: reduceRecord.custrecord_opening_in_po_addamount,
      });
      //内部采购数据-本期内部采购数据
      sumRecord.setValue({
        fieldId: "custrecord_current_in_po_quantity", //本期内部采购数量（整数）
        value: reduceRecord.custrecord_current_in_po_quantity,
      });
      sumRecord.setValue({
        fieldId: "custrecord_current_in_po_purchase_cost", //本期内部采购实际成本金额（货币） =(v1)【基价总额】合计；(v2)【基价总额】合计*本期合并汇率
        value:
          reduceRecord.custrecord_current_in_po_purchase_cost *
          reduceRecord.currentrate,
      });
      sumRecord.setValue({
        fieldId: "custrecord_current_in_po_addamount", //本期内部采购加成成本金额（货币） =(v1)【加价总额】合计；(v2)【加价总额】合计*本期合并汇率
        value:
          reduceRecord.custrecord_current_in_po_addamount *
          reduceRecord.currentrate,
      });
      //内部采购数据-截至本期期末内部采购累计数据
      sumRecord.setValue({
        fieldId: "custrecord_cumulative_in_po_quantity", //本期累计内部采购数量（整数） =期初内部采购数量+本期内部采购数量
        value:
          reduceRecord.custrecord_opening_in_po_quantity +
          reduceRecord.custrecord_current_in_po_quantity,
      });
      sumRecord.setValue({
        fieldId: "custrecord_cumulative_in_po_purchasecost", //本期累计内部采购实际成本金额（货币） =期初内部采购实际成本金额+本期内部采购实际成本金额
        value:
          reduceRecord.custrecord_opening_in_purchase_cost +
          reduceRecord.custrecord_current_in_po_purchase_cost,
      });
      var custrecord_cumulative_in_po_addamount =
        reduceRecord.custrecord_opening_in_po_addamount +
        reduceRecord.custrecord_current_in_po_addamount;
      sumRecord.setValue({
        fieldId: "custrecord_cumulative_in_po_addamount", //本期累计内部采购加成成本金额（货币）  =期初内部采购加成成本金额+本期内部采购加成成本金额
        value: custrecord_cumulative_in_po_addamount,
      });
      //损益数据-内部损益数据
      var custrecord_current_realized_profit =
        custrecord_avaliable_ex_po_price *
          reduceRecord.custrecord_current_ex_so_quantity -
        reduceRecord.custrecord_current_ex_so_cost;
      //(v2)当计算结果为负数时，结果=0
      //当本期累计内部采购加成成本金额=0时，结果=0
      //当计算结果≥本期累计内部采购加成成本金额时，结果=本期累计内部采购加成成本金额
      if (
        custrecord_current_realized_profit < 0 ||
        custrecord_cumulative_in_po_addamount == 0
      ) {
        custrecord_current_realized_profit = 0;
      } else if (
        custrecord_current_realized_profit >=
        custrecord_cumulative_in_po_addamount
      ) {
        custrecord_current_realized_profit =
          custrecord_cumulative_in_po_addamount;
      }
      sumRecord.setValue({
        fieldId: "custrecord_current_realized_profit", //本期已实现内部损益（货币） =(v1)本期采购单价*本期外部销售数量-本期系统结转成本；(v2)本期可用采购单价(本期可用外部采购单价)*本期外部销售数量-本期系统结转成本
        value: custrecord_current_realized_profit,
      });
      sumRecord.setValue({
        fieldId: "custrecord_cumulative_unrealized_profit", //截至本期未实现内部损益（货币）  =本期合计内部采购加成成本金额-本期已实现内部损益
        value:
          custrecord_cumulative_in_po_addamount -
          custrecord_current_realized_profit,
      });
      sumRecord.setValue({
        fieldId: "custrecord_cumulative_realized_profit", //截至本期累计已实现内部损益（货币）  =本期已实现内部损益+上期【截至本期累计已实现内部损益】
        value:
          custrecord_current_realized_profit +
          reduceRecord.custrecord_opening_realized_profit,
      });
      //结果
      sumRecord.save();
    });
    log.debug("报告完成");
  }

  //分类
  const map = (mapContext) => {
    // var inpRecord = JSON.parse(mapContext.value);
    // mapContext.write({
    //   key: inpRecord.custrecord_subsidiary + "," + inpRecord.custrecord_item,
    //   value: inpRecord,
    // });
  };

  //合并
  const reduce = (reduceContext) => {
    // var reduceRecord = null;
    // reduceContext.values.forEach((item) => {
    //   var mapRecord = JSON.parse(item);
    //   if (reduceRecord == null) {
    //     reduceRecord = new customrecord_unrealized_profit(
    //       mapRecord.custrecord_subsidiary,
    //       mapRecord.custrecord_year,
    //       mapRecord.custrecord_month,
    //       mapRecord.custrecord_item,
    //       mapRecord.currentrate
    //     );
    //   }
    //   reduceRecord.custrecord_opening_external_po_quantity +=
    //     mapRecord.custrecord_opening_external_po_quantity;
    //   reduceRecord.custrecord_opening_external_po_amount +=
    //     mapRecord.custrecord_opening_external_po_amount;
    //   reduceRecord.custrecord_opening_external_po_price +=
    //     mapRecord.custrecord_opening_external_po_price;
    //   reduceRecord.custrecord_current_ex_po_quantity +=
    //     mapRecord.custrecord_current_ex_po_quantity;
    //   reduceRecord.custrecord_current_ex_po_amount +=
    //     mapRecord.custrecord_current_ex_po_amount;
    //   reduceRecord.custrecord_current_ex_po_price +=
    //     mapRecord.custrecord_current_ex_po_price;
    //   reduceRecord.custrecord_available_ex_po_quantity +=
    //     mapRecord.custrecord_available_ex_po_quantity;
    //   reduceRecord.custrecord_availiable_ex_po_amount +=
    //     mapRecord.custrecord_availiable_ex_po_amount;
    //   reduceRecord.custrecord_avaliable_ex_po_price +=
    //     mapRecord.custrecord_avaliable_ex_po_price;
    //   reduceRecord.custrecord_current_ex_so_quantity +=
    //     mapRecord.custrecord_current_ex_so_quantity;
    //   reduceRecord.custrecord_current_ex_so_cost +=
    //     mapRecord.custrecord_current_ex_so_cost;
    //   reduceRecord.custrecord_closing_ex_po_quantity +=
    //     mapRecord.custrecord_closing_ex_po_quantity;
    //   reduceRecord.custrecord_closing_ex_po_amount +=
    //     mapRecord.custrecord_closing_ex_po_amount;
    //   reduceRecord.custrecord_closing_ex_po_price +=
    //     mapRecord.custrecord_closing_ex_po_price;
    //   reduceRecord.custrecord_opening_in_po_quantity +=
    //     mapRecord.custrecord_opening_in_po_quantity;
    //   reduceRecord.custrecord_opening_in_purchase_cost +=
    //     mapRecord.custrecord_opening_in_purchase_cost;
    //   reduceRecord.custrecord_opening_in_po_addamount +=
    //     mapRecord.custrecord_opening_in_po_addamount;
    //   reduceRecord.custrecord_current_in_po_quantity +=
    //     mapRecord.custrecord_current_in_po_quantity;
    //   reduceRecord.custrecord_current_in_po_purchase_cost +=
    //     mapRecord.custrecord_current_in_po_purchase_cost;
    //   reduceRecord.custrecord_current_in_po_addamount +=
    //     mapRecord.custrecord_current_in_po_addamount;
    //   reduceRecord.custrecord_cumulative_in_po_quantity +=
    //     mapRecord.custrecord_cumulative_in_po_quantity;
    //   reduceRecord.custrecord_cumulative_in_po_purchasecost +=
    //     mapRecord.custrecord_cumulative_in_po_purchasecost;
    //   reduceRecord.custrecord_cumulative_in_po_addamount +=
    //     mapRecord.custrecord_cumulative_in_po_addamount;
    //   reduceRecord.custrecord_current_realized_profit +=
    //     mapRecord.custrecord_current_realized_profit;
    //   reduceRecord.custrecord_cumulative_unrealized_profit +=
    //     mapRecord.custrecord_cumulative_unrealized_profit;
    //   reduceRecord.custrecord_cumulative_realized_profit +=
    //     mapRecord.custrecord_cumulative_realized_profit;
    //   reduceRecord.custrecord_opening_realized_profit +=
    //     mapRecord.custrecord_opening_realized_profit;
    // });
    // reduceContext.write({
    //   key: reduceContext.key,
    //   value: reduceRecord,
    // });
  };

  //汇总
  const summarize = (summaryContext) => {
    // summaryContext.output.iterator().each(function (key, value) {
    //   var reduceRecord = JSON.parse(value);
    //   var sumRecord = record.create({
    //     type: "customrecord_unrealized_profit",
    //   });
    //   //分类项
    //   sumRecord.setValue({
    //     fieldId: "custrecord_subsidiary",
    //     value: reduceRecord.custrecord_subsidiary,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_year",
    //     value: reduceRecord.custrecord_year,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_month",
    //     value: reduceRecord.custrecord_month,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_item",
    //     value: reduceRecord.custrecord_item,
    //   });
    //   //外部采购-期初外部采购结余
    //   sumRecord.setValue({
    //     fieldId: "custrecord_opening_external_po_quantity", //期初外部采购数量（整数）
    //     value: reduceRecord.custrecord_opening_external_po_quantity,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_opening_external_po_amount", //期初外部采购金额（货币）
    //     value: reduceRecord.custrecord_opening_external_po_amount,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_opening_external_po_price", //期初外部采购单价（货币）
    //     value: reduceRecord.custrecord_opening_external_po_price,
    //   });
    //   //外部采购-本期外部采购
    //   sumRecord.setValue({
    //     fieldId: "custrecord_current_ex_po_quantity", //本期外部采购数量（整数）
    //     value: reduceRecord.custrecord_current_ex_po_quantity,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_current_ex_po_amount", //本期外部采购金额（货币）
    //     value: reduceRecord.custrecord_current_ex_po_amount,
    //   });
    //   var custrecord_current_ex_po_price =
    //     reduceRecord.custrecord_current_ex_po_quantity == 0
    //       ? 0
    //       : reduceRecord.custrecord_current_ex_po_amount /
    //         reduceRecord.custrecord_current_ex_po_quantity;
    //   sumRecord.setValue({
    //     fieldId: "custrecord_current_ex_po_price", //本期外部采购单价（货币）  =本期外部采购金额/本期外部采购数量
    //     value: custrecord_current_ex_po_price,
    //   });
    //   //外部采购-本期合计外部采购
    //   var custrecord_available_ex_po_quantity =
    //     reduceRecord.custrecord_opening_external_po_quantity +
    //     reduceRecord.custrecord_current_ex_po_quantity;
    //   sumRecord.setValue({
    //     fieldId: "custrecord_available_ex_po_quantity", //本期可用外部采购数量（整数）  =期初数量+本期外部采购数量
    //     value: custrecord_available_ex_po_quantity,
    //   });
    //   var custrecord_availiable_ex_po_amount =
    //     reduceRecord.custrecord_opening_external_po_amount +
    //     reduceRecord.custrecord_current_ex_po_amount;
    //   sumRecord.setValue({
    //     fieldId: "custrecord_availiable_ex_po_amount", //本期可用外部采购金额（货币） =期初外部采购金额+本期外部采购金额
    //     value: custrecord_availiable_ex_po_amount,
    //   });
    //   var custrecord_avaliable_ex_po_price =
    //     custrecord_available_ex_po_quantity == 0
    //       ? 0
    //       : custrecord_availiable_ex_po_amount /
    //         custrecord_available_ex_po_quantity;
    //   sumRecord.setValue({
    //     fieldId: "custrecord_avaliable_ex_po_price", //本期可用外部采购单价（货币）  =本期可用外部采购金额/本期可用外部采购数量
    //     value: custrecord_avaliable_ex_po_price,
    //   });
    //   //外部销售-本期对外销售数据
    //   sumRecord.setValue({
    //     fieldId: "custrecord_current_ex_so_quantity", //本期外部销售数量（整数）
    //     value: reduceRecord.custrecord_current_ex_so_quantity,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_current_ex_so_cost", //本期外部销售系统结转成本（货币）
    //     value: reduceRecord.custrecord_current_ex_so_cost,
    //   });
    //   //期末外部采购结余数据-期末外部采购结余数据
    //   var custrecord_closing_ex_po_quantity =
    //     custrecord_available_ex_po_quantity +
    //     reduceRecord.custrecord_current_ex_so_quantity;
    //   sumRecord.setValue({
    //     fieldId: "custrecord_closing_ex_po_quantity", //期末外部采购结余数量（整数） =(v1)本期外部采购数量+本期外部销售数量；(v2)本期可用外部采购数量+本期外部销售数量
    //     value: custrecord_closing_ex_po_quantity,
    //   });
    //   var custrecord_closing_ex_po_amount =
    //     custrecord_closing_ex_po_quantity * custrecord_current_ex_po_price;
    //   sumRecord.setValue({
    //     fieldId: "custrecord_closing_ex_po_amount", //期末外部采购结余金额（货币） =期末外部采购结余数量*本期采购单价
    //     value: custrecord_closing_ex_po_amount,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_closing_ex_po_price", //期末外部采购结余单价（货币） =期末外部采购结余金额/期末外部采购结余数量
    //     value:
    //       custrecord_closing_ex_po_quantity == 0
    //         ? 0
    //         : custrecord_closing_ex_po_amount /
    //           custrecord_closing_ex_po_quantity,
    //   });
    //   //内部采购数据-期初内部采购累计结余
    //   sumRecord.setValue({
    //     fieldId: "custrecord_opening_in_po_quantity", //期初内部采购数量（整数）
    //     value: reduceRecord.custrecord_opening_in_po_quantity,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_opening_in_purchase_cost", //期初内部采购实际成本金额（货币）
    //     value: reduceRecord.custrecord_opening_in_purchase_cost,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_opening_in_po_addamount", //期初内部采购加成成本金额（货币）
    //     value: reduceRecord.custrecord_opening_in_po_addamount,
    //   });
    //   //内部采购数据-本期内部采购数据
    //   sumRecord.setValue({
    //     fieldId: "custrecord_current_in_po_quantity", //本期内部采购数量（整数）
    //     value: reduceRecord.custrecord_current_in_po_quantity,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_current_in_po_purchase_cost", //本期内部采购实际成本金额（货币） =(v1)【基价总额】合计；(v2)【基价总额】合计*本期合并汇率
    //     value:
    //       reduceRecord.custrecord_current_in_po_purchase_cost *
    //       reduceRecord.currentrate,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_current_in_po_addamount", //本期内部采购加成成本金额（货币） =(v1)【加价总额】合计；(v2)【加价总额】合计*本期合并汇率
    //     value:
    //       reduceRecord.custrecord_current_in_po_addamount *
    //       reduceRecord.currentrate,
    //   });
    //   //内部采购数据-截至本期期末内部采购累计数据
    //   sumRecord.setValue({
    //     fieldId: "custrecord_cumulative_in_po_quantity", //本期累计内部采购数量（整数） =期初内部采购数量+本期内部采购数量
    //     value:
    //       reduceRecord.custrecord_opening_in_po_quantity +
    //       reduceRecord.custrecord_current_in_po_quantity,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_cumulative_in_po_purchasecost", //本期累计内部采购实际成本金额（货币） =期初内部采购实际成本金额+本期内部采购实际成本金额
    //     value:
    //       reduceRecord.custrecord_opening_in_purchase_cost +
    //       reduceRecord.custrecord_current_in_po_purchase_cost,
    //   });
    //   var custrecord_cumulative_in_po_addamount =
    //     reduceRecord.custrecord_opening_in_po_addamount +
    //     reduceRecord.custrecord_current_in_po_addamount;
    //   sumRecord.setValue({
    //     fieldId: "custrecord_cumulative_in_po_addamount", //本期累计内部采购加成成本金额（货币）  =期初内部采购加成成本金额+本期内部采购加成成本金额
    //     value: custrecord_cumulative_in_po_addamount,
    //   });
    //   //损益数据-内部损益数据
    //   var custrecord_current_realized_profit =
    //     custrecord_avaliable_ex_po_price *
    //       reduceRecord.custrecord_current_ex_so_quantity -
    //     reduceRecord.custrecord_current_ex_so_cost;
    //   //(v2)当计算结果为负数时，结果=0
    //   //当本期累计内部采购加成成本金额=0时，结果=0
    //   //当计算结果≥本期累计内部采购加成成本金额时，结果=本期累计内部采购加成成本金额
    //   if (
    //     custrecord_current_realized_profit < 0 ||
    //     custrecord_cumulative_in_po_addamount == 0
    //   ) {
    //     custrecord_current_realized_profit = 0;
    //   } else if (
    //     custrecord_current_realized_profit >=
    //     custrecord_cumulative_in_po_addamount
    //   ) {
    //     custrecord_current_realized_profit =
    //       custrecord_cumulative_in_po_addamount;
    //   }
    //   sumRecord.setValue({
    //     fieldId: "custrecord_current_realized_profit", //本期已实现内部损益（货币） =(v1)本期采购单价*本期外部销售数量-本期系统结转成本；(v2)本期可用采购单价(本期可用外部采购单价)*本期外部销售数量-本期系统结转成本
    //     value: custrecord_current_realized_profit,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_cumulative_unrealized_profit", //截至本期未实现内部损益（货币）  =本期合计内部采购加成成本金额-本期已实现内部损益
    //     value:
    //       custrecord_cumulative_in_po_addamount -
    //       custrecord_current_realized_profit,
    //   });
    //   sumRecord.setValue({
    //     fieldId: "custrecord_cumulative_realized_profit", //截至本期累计已实现内部损益（货币）  =本期已实现内部损益+上期【截至本期累计已实现内部损益】
    //     value:
    //       custrecord_current_realized_profit +
    //       reduceRecord.custrecord_opening_realized_profit,
    //   });
    //   //结果
    //   log.debug("sumRecord", sumRecord);
    //   sumRecord.save();
    //   return true;
    // });
  };

  return { getInputData, map, reduce, summarize };
});
