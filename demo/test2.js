define([], function(){
  return L_runMonads([
    function(){return resolve(L_newDefine)("testSingleCondition", 7, "testSingleCondition cv dv item myloc bf carryCount counter =\r\n  (eq cv 1)\r\n    (eq (at item ITEM_LOCATION) CARRIED)\r\n    (eq cv 2)\r\n      (eq (at item ITEM_LOCATION) myloc)\r\n      (eq cv 3)\r\n        (or (eq (at item ITEM_LOCATION) CARRIED) (eq (at item ITEM_LOCATION) myloc))\r\n        (eq cv 4)\r\n          (eq myloc dv)\r\n          (eq cv 5)\r\n            (neq (at item ITEM_LOCATION) myloc)\r\n            (eq cv 6)\r\n              (neq (at item ITEM_LOCATION) CARRIED)\r\n              (eq cv 7)\r\n                (neq myloc dv)\r\n                (eq cv 8)\r\n                  (at bf dv)\r\n                  (eq cv 9)\r\n                    (not (at bf dv))\r\n                    (eq cv 10)\r\n                      (neq carryCount 0)\r\n                      testSingleCondition2 cv dv item myloc bf carryCount counter", lazy((function(L_cv, L_dv, L_item, L_myloc, L_bf, L_carryCount, L_counter) {
    return arguments.callee.length != arguments.length
        ? Leisure_primCall(arguments.callee, 0, arguments)
        : resolve(L_eq)(L_cv, 1)(function(){return resolve(L_eq)(function(){return resolve(L_at)(L_item, L_ITEM_LOCATION)}, L_CARRIED)})(function(){return resolve(L_eq)(L_cv, 2)(function(){return resolve(L_eq)(function(){return resolve(L_at)(L_item, L_ITEM_LOCATION)}, L_myloc)})(function(){return resolve(L_eq)(L_cv, 3)(function(){return resolve(L_or)(function(){return resolve(L_eq)(function(){return resolve(L_at)(L_item, L_ITEM_LOCATION)}, L_CARRIED)}, function(){return resolve(L_eq)(function(){return resolve(L_at)(L_item, L_ITEM_LOCATION)}, L_myloc)})})(function(){return resolve(L_eq)(L_cv, 4)(function(){return resolve(L_eq)(L_myloc, L_dv)})(function(){return resolve(L_eq)(L_cv, 5)(function(){return resolve(L_neq)(function(){return resolve(L_at)(L_item, L_ITEM_LOCATION)}, L_myloc)})(function(){return resolve(L_eq)(L_cv, 6)(function(){return resolve(L_neq)(function(){return resolve(L_at)(L_item, L_ITEM_LOCATION)}, L_CARRIED)})(function(){return resolve(L_eq)(L_cv, 7)(function(){return resolve(L_neq)(L_myloc, L_dv)})(function(){return resolve(L_eq)(L_cv, 8)(function(){return resolve(L_at)(L_bf, L_dv)})(function(){return resolve(L_eq)(L_cv, 9)(function(){return resolve(L_not)(function(){return resolve(L_at)(L_bf, L_dv)})})(function(){return resolve(L_eq)(L_cv, 10)(function(){return resolve(L_neq)(L_carryCount, 0)})(function(){return resolve(L_testSingleCondition2)(L_cv)(L_dv)(L_item)(L_myloc)(L_bf)(L_carryCount)(L_counter)})})})})})})})})})});
})))}
  ]);
});
//# sourceMappingURL=test2.map