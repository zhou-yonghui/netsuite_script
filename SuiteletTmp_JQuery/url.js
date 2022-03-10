define([ 'N/runtime' ], function(runtime) {
    // 当前环境的account id
    var accountId = runtime.accountId;
    // 返回的对象
    var returnJson;
    // 对应环境中加载的模块位置
    var modulPath = '/SuiteBundles/Bundle 408669/Minnov/config/' + accountId + '/url';
    require([ modulPath ], function(auth) {
        returnJson = auth;
    });
    return returnJson;
});