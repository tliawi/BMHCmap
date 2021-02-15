/* 
BMHC.js

Copyright 2021 John R C Fairfield, see MIT License
*/

function BMHCobj(){
    
    function sortObj(obj) {
      return Object.keys(obj).sort(new Intl.Collator('en').compare).reduce(function (result, key) {
        result[key] = obj[key];
        return result;
      }, {});
    }
    
    const brethren  = 1;
    const mennonite = 2;
    // 0 neither, 3 both
    // name:val pairs, in names no double quotes, no ampersand. Blanks, Apostrophe are OK
    
    var assemblies = {}; //a dictionary of assemblyData, the keys being assembly names
    
    function event(MIdate,verb,object,note){ //all strings
        this.date = date;
        this.verb = verb;
        this.object = object;
        this.note = note;
    }
    
    function assemblyData(mb){
        this.mb = mb;
        this.events = []; //an array of events comprising the history of an assembly
        this.states = []; //an array of states parallel to events. Display accellerator.
    }
    
    function init(){
        var mockupAssemblies = {
            "2nd District of Virginia":{mb:1,events:[],states:[]},
            "Brethren Woods Camp and Retreat Center":{mb:1,events:[],states:[]},
            "Bridgewater":{mb:1,events:[],states:[]},
            "Church of the Brethren":{mb:1,events:[],states:[]},
            "Cooks Creek":{mb:1,events:[],states:[]},
            "Dayton":{mb:1,events:[],states:[]},
            "Garber's":{mb:1,events:[],states:[]},
            "German Baptist Brethren":{mb:1,events:[],states:[]},
            "Harrisonburg First":{mb:1,events:[],states:[]},
            "Meeting at Solomon Garber home":{mb:1,events:[],states:[]},
            "Park View":{mb:2,events:[],states:[]},
            "Community (Harrisonburg)":{mb:2,events:[],states:[]},
            "Dayton Mennonite":{mb:2,events:[],states:[]},
            "Pike":{mb:2,events:[],states:[]}, 
            "Bank":{mb:2,events:[],states:[]},
            "Weaver's":{mb:2,events:[],states:[]},
            "Harrisonburg":{mb:2,events:[],states:[]},
            "Pleasant View":{mb:2,events:[],states:[]},
            "Virginia Conference":{mb:2,events:[],states:[]},
            "MCUSA":{mb:2,events:[],states:[]},
            "Anne Arbor":{mb:3,events:[],states:[]},
            "the National Cathedral":{mb:0,events:[],states:[]},
        };
        
        //philosopy: maintain assemblies in sorted key order, is read more often than written.
        assemblies = sortObj(mockupAssemblies); 
        
    }
        
    function getAllAssemblies(){
        return Object.keys(assemblies);
    }
    
    function getMennoniteAssemblies(){
        return getAllAssemblies().filter(name => assemblies[name].mb & mennonite);
    }
    
    function getBrethrenAssemblies(){
        return getAllAssemblies().filter(name => assemblies[name].mb & brethren);
    }
    
    function getJointAssemblies(){
        return getAllAssemblies().filter(name => assemblies[name].mb); //i.e. mb != 0
    }
    
    function getNeitherAssemblies(){
        return getAllAssemblies().filter(name => assemblies[name].mb == 0);
    }
    
    function assemblyExists(name){
        return (name in assemblies);
    }
    
    function addAssembly(name,mb){ //mb 00:neither 10:Mennonnite 01:Brethren 11:both
        if (assemblyExists(name))return false;
        assemblies[name] = new assemblyData(mb);
        assemblies = sortObj(assemblies);
        return true;
    }
    
    function deleteAssembly(name){
        //tosses assembly and its assemblyData, including all events therein.
        delete assemblies[name]; //doesn't throw anything if it doesn't exist.
        
        //.........still have to go through and delete all events having this name as object ?? Or just leave them as historical anomalies?
    }
    
    //A date 
    //is "yyyy      "
    //or "yyyy/mm   "
    //or "yyyy/mm/dd"
    //boolean
    function checkDate(candidate){
        
        function remainderBlank(i){ return candidate.substr(i).trim().length == 0;}
        
        function allDigits(start,len){
            var snippet = candidate.substr(start,len);
            if ( snippet.length != len) return false;
            return /^\d+$/.test(snippet);
        }
        
        if (candidate.length != 10) return false;
        
        if (!allDigits(0,4)) return false
        if (candidate.substr(0,4) < "1000" || candidate.substr(0,4) > "3000") return false; 
        if (remainderBlank(4)) return true; // yyyy
        if (yyyymmdd.charAt(4) != '/') return false;
        if (!allDigits(5,2)) return false;
        if (candidate.substr(5,2)<"01" || candidate.substr(5,2) > "12") return false; //months
        if (remainderBlank(7)) return true; // yyyy/mm
        if (candidate.charAt(7) != '/') return false;
        if (!allDigits(8,2)) return false;
        if (candidate.substr(8,2)<"01" || candidate.substr(8,2) > "31") return false; //short months sneak through
        return true; //yyyy/mm/dd
    }
    
    function getEventStrings(assembly){ 
        return ["   1 1878/04/27 set-locale 38.3771809888396, -79.03095281203701"];
    }
    
    init();
    
    return {getAllAssemblies:getAllAssemblies,
            getMennoniteAssemblies:getMennoniteAssemblies,
            getBrethrenAssemblies:getBrethrenAssemblies,
            getNeitherAssemblies:getNeitherAssemblies,
            assemblyExists:assemblyExists,
            addAssembly:addAssembly,
            deleteAssembly:deleteAssembly,
            getEventStrings:getEventStrings,
            checkDate:checkDate,
           };
}