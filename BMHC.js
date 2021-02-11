/* 
BMHC.js

Copyright 2021 John R C Fairfield, see MIT License
*/

function BMHCobj(){
    
    function sortObj(obj) {
      return Object.keys(obj).sort().reduce(function (result, key) {
        result[key] = obj[key];
        return result;
      }, {});
    }
    
    //name:0 or name:1 pairs, 0 menno, 1 brethren, in names no double quotes, no ampersand. Blanks, Apostrophe are OK
    var assemblies = {};
    var events = {};
    
    
    function init(){
        var mockupAssemblies = {"2nd District of Virginia":1,"Brethren Woods Camp and Retreat Center":1,"Bridgewater":1,"Church of the Brethren":1,"Cooks Creek":1,"Dayton":1,"Garber's":1,"German Baptist Brethren":1,"Harrisonburg First":1,"Meeting at Solomon Garber home":1, "Park View":0, "Community (Harrisonburg)":0, "Dayton Mennonite":0, "Pike":0, "Bank":0, "Weaver's":0, "Harrisonburg":0, "Pleasant View":0};
        
        //philosopy: maintain assemblies in sorted key order, is read more often than written.
        assemblies = sortObj(mockupAssemblies); 
        
    }
        
    function getAssemblies(){
        return Object.keys(assemblies);
    }
    
    function getMennos(){
        return getAssemblies().filter(name => assemblies[name] == 0);
    }
    
    function getBros(){
        return getAssemblies().filter(name => assemblies[name] == 1);
    }
    
    init();
    
    return {getAssemblies:getAssemblies,
            getMennos:getMennos,
            getBros:getBros,
           };
}