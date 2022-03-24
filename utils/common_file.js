//隐藏自定义记录中子列表上的编辑删除链接
var common_method = {
    hideViewElements: function (context, table) {
        var tmpHtmlVal = '';
        tmpHtmlVal = tmpHtmlVal + '<script>window.addEventListener("load",function(e){';
        tmpHtmlVal = tmpHtmlVal + '    hideIregulaFields();';
        tmpHtmlVal = tmpHtmlVal + '});';
        tmpHtmlVal = tmpHtmlVal + 'function hideIregulaFields(){';
        tmpHtmlVal = tmpHtmlVal + '    var $=jQuery;';
        if (context.type == 'view') {
            //这部分是View模式下的
            tmpHtmlVal = tmpHtmlVal + '        var projectTable=$("#' + table + '");';
            tmpHtmlVal = tmpHtmlVal + '        var editIndex=projectTable.find(".uir-list-headerrow td[data-label=\'编辑\']").index();';
            tmpHtmlVal = tmpHtmlVal + '        var deleteIndex=projectTable.find(".uir-list-headerrow td[data-label=\'删除\']").index();';
            tmpHtmlVal = tmpHtmlVal + '        if (editIndex!=-1){';
            tmpHtmlVal = tmpHtmlVal + '            editIndex++;';
            tmpHtmlVal = tmpHtmlVal + '            projectTable.find("td:nth-child( "+editIndex+" )").hide();';
            tmpHtmlVal = tmpHtmlVal + '        }';
            tmpHtmlVal = tmpHtmlVal + '        if (deleteIndex!=-1){';
            tmpHtmlVal = tmpHtmlVal + '            deleteIndex++;';
            tmpHtmlVal = tmpHtmlVal + '            projectTable.find("td:nth-child( "+deleteIndex+" )").hide();';
            tmpHtmlVal = tmpHtmlVal + '        }';
        }
        tmpHtmlVal = tmpHtmlVal + '}';
        tmpHtmlVal = tmpHtmlVal + '</script>';
        context.form.addField({ type : 'inlinehtml', label : ' &nbsp; ', id : 'custpage_hideviewelements' }).defaultValue = tmpHtmlVal;
    }
}