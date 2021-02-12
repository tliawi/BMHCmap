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
    
    const brethren  = 1;
    const mennonite = 2;
    // 0 neither, 3 both
    // name:val pairs, in names no double quotes, no ampersand. Blanks, Apostrophe are OK
    
    var assemblies = {};
    var events = {};
    
    
    function init(){
        var mockupAssemblies = {"2nd District of Virginia":1,"Brethren Woods Camp and Retreat Center":1,"Bridgewater":1,"Church of the Brethren":1,"Cooks Creek":1,"Dayton":1,"Garber's":1,"German Baptist Brethren":1,"Harrisonburg First":1,"Meeting at Solomon Garber home":1, "Park View":2, "Community (Harrisonburg)":2, "Dayton Mennonite":2, "Pike":2, "Bank":2, "Weaver's":2, "Harrisonburg":2, "Pleasant View":2, "Virginia Conference":2, "MCUSA":2, "Anne Arbor":3, "the National Cathedral":0};
        
        //philosopy: maintain assemblies in sorted key order, is read more often than written.
        assemblies = sortObj(mockupAssemblies); 
        
    }
        
    function getAllAssemblies(){
        return Object.keys(assemblies);
    }
    
    function getMennoniteAssemblies(){
        return getAllAssemblies().filter(name => assemblies[name] & mennonite);
    }
    
    function getBrethrenAssemblies(){
        return getAllAssemblies().filter(name => assemblies[name] & brethren);
    }
    
    function getJointAssemblies(){
        return getAllAssemblies().filter(name => assemblies[name]); //i.e. != 0
    }
    
    function getNeitherAssemblies(){
        return getAllAssemblies().filter(name => assemblies[name] == 0);
    }
    
    init();
    
    return {getAllAssemblies:getAllAssemblies,
            getMennoniteAssemblies:getMennoniteAssemblies,
            getBrethrenAssemblies:getBrethrenAssemblies,
            getNeitherAssemblies:getNeitherAssemblies,
           };
}