/* 
BMHC.js

Copyright 2021 John R C Fairfield, see MIT License
*/

function BMHCobj(){
    
    
    const brethren  = 1;
    const mennonite = 2;
    // 0 neither, 3 both
    // name:val pairs, in names no double quotes, no ampersand. Blanks, Apostrophe are OK
    
    // unfinished 
    // means to add labels (never remove them)
    // save db to storage somewhere
    var db = {
        idSource:123, //source of unique assembly ids.
        verbs:{"set-locale":1, "set-weight":1, "set-affiliation":1, "photo":1, "set-label":1, "see-note":1,}, //see checkObject()
        labels:{"paid minister","flag in sanctuary",},
        assemblies:{}, //a dictionary of assemblyData, the keys being assembly names
    }
    
    var idToName = {}; //a dictionary of id:assemblyName pairs.
    
    //id's are references, "[d+]"
    //the reason for references, and idToName, is so one can change the name of an assembly
    //and all the stored object and note references do NOT have to change.
    ---todo next: replace name refs with id refs in notes. Do assembly name change.
    function getNextId(){
        return "["+(db.idSource++)+"]";
    }
            
    function assemblyData(mb){
        this.id = getNextId();
        this.mb = mb;
        this.events = []; //an array of events comprising the history of an assembly
        this.states = []; //an array of states parallel to events. Display accellerator.
    }
    
    
    function sortObj(obj) {
      return Object.keys(obj).sort(new Intl.Collator('en').compare).reduce(function (result, key) {
        result[key] = obj[key];
        return result;
      }, {});
    }
    
    function buildIdToName(){
        Object.entries(db.assemblies).forEach(([name, assemblyData]) => idToName[assemblyData.id] = name);
    }
    
    function init(){
        const mockupAssemblies = {
            "2nd District of Virginia":{id:10, mb:1,events:[],states:[]},
            "Brethren Woods Camp and Retreat Center":{id:2, mb:1,events:[],states:[]},
            "Bridgewater":{id:4, mb:1,events:[],states:[]},
            "Church of the Brethren":{id:3, mb:1,events:[],states:[]},
            "Cooks Creek":{id:8, mb:1,events:[],states:[]},
            "Dayton":{id:7, mb:1,events:[],states:[]},
            "Garber's":{id:6, mb:1,events:[],states:[]},
            "German Baptist Brethren":{id:1, mb:1,events:[],states:[]},
            "Harrisonburg First":{id:20, mb:1,events:[],states:[]},
            "Meeting at Solomon Garber home":{id:18, mb:1,events:[],states:[]},
            "Park View":{id:19, mb:2,events:[],states:[]},
            "Community (Harrisonburg)":{id:17, mb:2,events:[],states:[]},
            "Dayton Mennonite":{id:16, mb:2,events:[],states:[]},
            "Pike":{id:15, mb:2,events:[],states:[]}, 
            "Bank":{id:14, mb:2,events:[],states:[]},
            "Weaver's":{id:12, mb:2,events:[],states:[]},
            "Harrisonburg":{id:13, mb:2,events:[],states:[]},
            "Pleasant View":{id:25, mb:2,events:[],states:[]},
            "Virginia Conference":{id:27, mb:2,events:[],states:[]},
            "MCUSA":{id:5, mb:2,events:[],states:[]},
            "Anne Arbor":{id:21, mb:3,events:[],states:[]},
            "the National Cathedral":{id:22, mb:0,events:[],states:[]},
        };
        
        const mockupBridgewaterEvents = [
            new event("1878","set-locale","38.3771809888396,-79.03095281203701",""),
            new event("1878","set-affiliation","[8]",""),
            new event("1878/06/22","photo","https://photos.app.goo.gl/XCJtqEQEyVsfogGEA",""),
            new event("1907","set-affiliation","[10]","[4] becomes independent from [8]"),
            new event("1907","set-weight","201"),
            new event("1915","set-label","paid minister"),
        ];
        
        //philosopy: maintain assemblies in sorted key order, is read more often than written.
        db.assemblies = sortObj(mockupAssemblies);
        
        mockupBridgewaterEvents.forEach(event => addEvent(event)
        buildIdToName();
    }
        
    function getAllAssemblies(){
        return Object.keys(db.assemblies);
    }
    
    function getMennoniteAssemblies(){
        return getAllAssemblies().filter(name => db.assemblies[name].mb & mennonite);
    }
    
    function getBrethrenAssemblies(){
        return getAllAssemblies().filter(name => db.assemblies[name].mb & brethren);
    }
    
    function getJointAssemblies(){
        return getAllAssemblies().filter(name => db.assemblies[name].mb); //i.e. mb != 0
    }
    
    function getNeitherAssemblies(){
        return getAllAssemblies().filter(name => db.assemblies[name].mb == 0);
    }
    
    function assemblyExists(name){
        return (name in db.assemblies);
    }
    
    function addAssembly(name,mb){ //mb 00:neither 10:Mennonnite 01:Brethren 11:both
        if (assemblyExists(name))return false;
        db.assemblies[name] = new assemblyData(mb);
        db.assemblies = sortObj(db.assemblies);
        return true;
    }
    
    function deleteAssembly(name){
        //tosses assembly and its assemblyData, including all events therein.
        delete db.assemblies[name]; //doesn't throw anything if it doesn't exist.
        
        //.........still have to go through and delete all events having this name as object ?? Or just leave them as historical anomalies?
    }
    
    //returns "ok" if it succeeds, else an error statement
    function addEvent(subjectAssembly,date,verb,object,note){ //all these are strings as given by user
        
        function event(MIdate,verb,object,note){
            this.date = date;
            this.verb = verb;
            this.object = object;
            this.note = note;
        }
        
        function placeEvent(subjectAssembly,date,verb,object,note){
            var evs = db.assemblies[subjectAssembly].events;
            evs[evs.length] = new event(date,verb,object,note)
        }
        
        function compareDate(e1,e2){
            return (e1.date < e2.date)?-1:((e1.date < e2.date)?1:0);
        }
        
        subjectAssembly = subjectAssembly.trim;
        date = date.trim;
        verb = verb.trim;
        object = object.trim;
        note = note.trim;
        if (!assemblyExists(subjectAssembly)) return "subject assembly doesn't exist";
        else if (!checkDate(date)) return "bad date";
        else {
            const critique = okVerbObject(verb,object);
            if (critique != "ok") return critique;
            if (verb == set-affiliation) object = db.assemblies[subjectAssembly].id; // !!!
            //unfinished: replace [references] in notes---------
            const evs = db.assemblies[subjectAssembly].events;
            evs.push(new event(date,verb,object,note));
            evs.sort((e1,e2)=>compareDate(e1,e2));
            return "ok";
        }
    }
    
    function checkVerb(verb){
        return (verb in db.verbs);
    }
    
    function okVerbObject(verb, object){
        if (checkVerb(verb)){
            switch (verb){
                case "set-locale":
                    if (object.length > 0) return "ok"; //------unfinished checkGPS(object as gpscoord)
                    else return "bad GPS coordinates";
                case "set-weight":
                    if (object.length && allDigits(0,object.length)) return "ok";
                    else return "bad weight amount";
                case "set-affiliation":
                    if (assemblyExists(object)) return "ok";
                    else return "unrecognized assembly name";
                case "photo": 
                    if (object.length > 0) return "ok"; //---------------unfinished checkURL??? 
                    else return "bad URL";
                case "set-label":
                    if (object in db.labels) return "ok";
                    else return "unrecognized label";
                case "see-note":
                    if (object.length > 0) return "ok";
                    else return "nothing in note";
                default: "verb not recognized";
            }
        } else return "unrecognized verb";
    }
    
    function allDigits(start,len){
        var snippet = candidate.substr(start,len);
        if ( snippet.length != len) return false;
        return /^\d+$/.test(snippet);
    }
    
    //A date 
    //is "yyyy      "
    //or "yyyy/mm   "
    //or "yyyy/mm/dd"
    //boolean
    function checkDate(candidate){
        
        function remainderBlank(i){ return candidate.substr(i).trim().length == 0;}
        
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
    
    //returns an array of eventToStrings corresponding to the events of an assembly
    function getEventStrings(assembly){ 
        
        function renderIDs(str){ //replace each [id] reference with [name] reference
            const refs = str.match(/\[\d+\]/g) ; //returns an array of refs "[d+]" from the strings
            refs.forEach(ref=>str.replace(ref,idToName[ref]);
        }
        
        //flesh out str with trailing blanks to be (at least) len chars long.
        function buff(str,len){ 
            if (len <= str.length) return str;
            else return str + " ".repeat(len-str.length);
        }
        
        function eventToString(ev){
            return buff(ev.date,10) + " " + ev.verb + " " + ((ev.verb == "set-affiliation")?idToName[ev.obj]:ev.obj) + " " + renderIDs(ev.note);
        }
        
        if (assemblyExists(assembly)) {
            const evs = db.assemblies[assembly].events;
            return db.assemblies[assembly].events.map(ev => eventToString(ev));
        }
        else return [];
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
            idToName:idToName,
           };
}