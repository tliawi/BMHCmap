/* 
BMHC.js

version 0.11 Copyright 2021 John R C Fairfield, see MIT License

*/

function BMHCobj(){
    
    const brethren  = 1;
    const mennonite = 2;
    // 0 neither, 3 both
    // name:val pairs, in names no double quotes, no ampersand. Blanks, Apostrophe are OK
    
    // unfinished 
    // save db to storage somewhere
    // which will manage concurrent access to getNextId
    // and make addAssembly, changeAssembly, addEvent etc atomic to external db.
    // Implies all db writes will become asynch
    function bmhcDatabase(){
        this.idSource = 13; //source of unique ids for both assemblies and events
        this.verbs = ["set-locale", "set-weight", "set-affiliation", "photo", "add-tag", "remove-tag", "see-note", "expire-into"]; //maintain parallel to critiqueVerbObject() and bmhcMapDisplay.html
        this.tags = [];
        this.assemblies = {}; //a dictionary of assemblyData, the keys being assembly names
    }
    
    const db = new bmhcDatabase();
    
    let idToName = {}; //a dictionary of numeric id:string assemblyName pairs, 
    // not necessarily sorted if we merge concurrent access files...
    
    //the reason for ids, and idToName, is so one can change the name of an assembly
    //and all the stored object and note ids do NOT have to change.
    //this can generate on the order of 2^52 ids, so not to worry.
    function getNextId(){
        return db.idSource++;
    }
    
    function getVerbs(){
        return [...db.verbs];
    }
    
    function getTags(){
        return [...db.tags];
    }
    
    function setTags(tags){
        db.tags = tags;
    }
    
    function assemblyData(mb){
        this.id = getNextId();
        this.mb = mb;
        this.events = []; //an array of events comprising the history of an assembly
        //this.states is added when compiled
    }
    
    
    function sortObjByKeys(obj) {
      return Object.keys(obj).sort(new Intl.Collator('en').compare).reduce(function (result, key) {
        result[key] = obj[key];
        return result;
      }, {});
    }
    
    function buildIdToName(){
        idToName={};
        Object.entries(db.assemblies).forEach(([name, assemblyData]) => idToName[assemblyData.id] = name);
    }
    
    //only works with a valid date!!
    function yearLater(date){
        let yr = parseInt(date);
        return (yr+1).toString() + date.substr(4);
    }
    
    function getAllAssemblyNames(){
        return Object.keys(db.assemblies);
    }
    
    function getMennoniteAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb & mennonite);
    }
    
    function getBrethrenAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb & brethren);
    }
    
    function getJointAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb == 3);
    }
    
    function getNeitherAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb == 0);
    }
    
    function getDenomination(name){
        if (assemblyExists(name)) return db.assemblies[name].mb; else return 0;
    }
    
    function assemblyExists(name){
        return (name in db.assemblies);
    }
    
    
    function lifeSpan(events){
        if (events.length){
            let end = maxDate;
            if (events[events.length-1].verb == 'expire-into') end = events[events.length-1].date;
            return { begin: events[0].date, end: end };
        }
        else return null;
    }
    
    function lastEvent(name){
        if (assemblyExists(name)) {
            let len = db.assemblies[name].events.length;
            if (len) return db.assemblies[name].events[len-1];
        }
        return null; //doesn't exist, or has no events
    }
    
    function expirationDate(name){
        var lastEv = lastEvent(name);
        if (lastEv && lastEv.verb == 'expire-into') return lastEv.date;
        if (lastEv) return maxDate; //exists and hasn't expired
        return ''; //doesn't exist, or has no events, i.e. has never existed in time. 
        //Note both '0' and '0000' are true, '' is false.
    }
    
    function legitAssemblyParms(name, mb){
        // check for null, undefined, "", unfortunately 0, false.
        if (!Boolean(name)) return "blank names not allowed.";
        //does the return if mb is "whatever", whereas (mb<0 || mb > 3) would not
        if (!(mb >= 0 && mb <= 3)) return "this denomination not accepted.";
        if (name.trim().length == 0) return "blank names not allowed.";
        if (name.match(/\[/) || name.match(/\]/)) return "square brackets [ and ] not allowed in assembly names";
        return "ok";
    }
    
    
    function addAssembly(name,mb){ //mb bx00:neither bx10:Mennonnite bx01:Brethren bx11:both
        if (legitAssemblyParms(name,mb)!="ok") return legitAssemblyParms(name,mb); //defends against null, undefined etc.
        name = name.trim();
        if (assemblyExists(name))return "an assembly of this name already exists";
        
        var newAssy = new assemblyData(mb);
        db.assemblies[name] = newAssy;
        db.assemblies = sortObjByKeys(db.assemblies);
        idToName[newAssy.id] = name; //maintain idToName
        return "ok";
    }
    
    function changeAssembly(oldName, newName, mb){
        var data;
        if (legitAssemblyParms(newName,mb)!="ok") return legitAssemblyParms(newName,mb); //defends against null
        newName= newName.trim();
        if (!assemblyExists(oldName)) return "Target assembly doesn't exist.";
        if (newName != oldName && assemblyExists(newName)) return "an assembly of this name already exists."
        
        data = db.assemblies[oldName];
        delete db.assemblies[oldName];
        data.mb = mb; //keep id, events
        db.assemblies[newName] = data; //rename it keeping same id
        db.assemblies = sortObjByKeys(db.assemblies);
        idToName[data.id] = newName; //maintain idToName
        return "ok";
    }
    
    function removeInvalidEventReferences(id){
        let count = 0;
        const re = new RegExp('\['+id+'\]','g');
        
        function filterAffiliationEvents(assembly){
            db.assemblies[assembly].events = db.assemblies[assembly].events.filter(event =>{
                if (event.verb == "set-affiliation" && event.object == id ){count++; return false;}
                else return true;
            });
        }
        
        function clobberNoteReferences(assembly){
            db.assemblies[assembly].events.forEach(event =>{ 
                let c = (event.note.match(re) || []).length; //match can return null
                if (c) event.note = event.note.replaceAll('['+id+']','???');
                count += c;
            });
        }
    
        //scan and remove set-affiliation events whose objects == id, maintaining order of events
        Object.keys(db.assemblies).forEach(assembly => { 
            filterAffiliationEvents(assembly); 
            clobberNoteReferences(assembly);
        });
        
        return count;
    }
    
    //returns the number of invalidated references that have been removed
    function deleteAssembly(name){
        //tosses assembly and its assemblyData, including all events therein.
        const id = db.assemblies[name].id;
        delete db.assemblies[name]; //doesn't throw anything if it doesn't exist.
        delete idToName[id]; //maintain idToName
        return removeInvalidEventReferences(id);
    }
    
    //------ refs, whether idRefs [id], or namerefs [name]
    
    function cutOffEnds(ref){ return ref.substr(1,ref.length-2); }
    
    function isNumeric(input){
        return (input - 0) == input && (''+input).trim().length > 0;
    }
    
    function addBrackets(str) { return "[" + str + "]"; }
    
    function nameRefToIdRef(nameRef){
        return addBrackets(db.assemblies[cutOffEnds(nameRef)].id);
    }
    
    function idRefToNameRef(idRef){
        return addBrackets(idToName[cutOffEnds(idRef)]);
    }
    
    //------------------------ Events ------------------------------------
    // The events of an assembly are an array ordered by date.
    // The array index number of a given event can be changed by addition or deletion of other event.
    // But if there have been no intervening additions or deletions (beware concurrent access)
    // then an event's indexed position within getEventStrings
    // can be used to delete that event.
    // There is no changeEvent: you have to first delete the old event and then add a new one.
    
    function naiveEvent(date,verb,object,note){
        this.date = date;
        this.verb = verb;
        this.object = object;
        this.note = note;
    }
    
    function placeValidatedEvent(subjectAssembly,date, verb,object,note){
            
        function compareDates(e1,e2){return (e1.date < e2.date)?-1:((e1.date > e2.date)?1:0);}

        const evs = db.assemblies[subjectAssembly].events;
        evs.push(new naiveEvent(date,verb,object,note));
        evs.sort(compareDates);
    }

    //does total scan of db searching for references to subjectAssembly outside the given lifeSpan.
    function checkReferences(subjectAssembly, span){
        
        var myId = db.assemblies[subjectAssembly].id;
        
        //if in other assemblies there are set-affiliation or expire-into events outside my lifespan, complain!
        //total scan of db! NOTE: can't 'return' (or break) a forEach, so I use old fashioned loops
        
        var kees = Object.keys(db.assemblies);
        for (let i=0; i<kees.length; i++){ 
            let name=kees[i]; 
            let data = db.assemblies[name];
            if (name!=subjectAssembly){ //skip myself
                for (let j=0; j<data.events.length; j++) {
                    let event = data.events[j];
                    if (event.object == myId && (event.verb == 'set-affiliation' || event.verb == 'expire-into')){
                        if (!span || event.date < span.begin) return name+" has a "+event.verb+" event referring to "+subjectAssembly+" that is dated ("+event.date+") before "+subjectAssembly+" will exist. Please fix.";
                        
                        if (event.date > span.end) return name+" has a "+event.verb+" event referring to "+subjectAssembly+" that is dated ("+event.date+") after "+subjectAssembly+" is supposed to expire ("+date+"). Please fix.";
                    }
                }
            }
        }
        
        return 'ok';
    }
    
    
    //returns "ok" if it succeeds, else an error statement
    //if doIt is false, do not do final add, just do all the checks
    function addEvent(subjectAssembly,date,verb,object,note, doIt){ 
        
        subjectAssembly = subjectAssembly.trim();
        date = date.trim();
        verb = verb.trim();
        object = object.trim();
        note = note.trim();
        
        if (!assemblyExists(subjectAssembly)) return "subject assembly doesn't exist";
        else if (checkDate(date)!="ok") return checkDate(date);
        else {
            if (critiqueVerbObject(verb,object) != "ok") return critiqueVerbObject(verb,object);
            
            if (verb == "set-affiliation"){
                if (object.length) {
                    if (object == subjectAssembly) return "can't affiliate with yourself";
                    let lf = lifeSpan(db.asssemblies[object].events);
                    if (!lf || lf.begin > date) return object+" doesn't exist yet. Give it some events before "+date+".";
                    if (lf.end < date) return object+" has already expired by "+date+"."
                    object = db.assemblies[object].id;
                } //else object is blank, it's ok to disaffiliate from everything.
            }
            
            if (verb == "expire-into" ){
                
                //first check my own event list
                let le = lastEvent(subjectAssembly);
                if (le && le.date > date) return "Expiration must be "+subjectAssembly+"'s last event, by date. There are events after "+date+", please fix."
                
                //total scan of db
                let span = lifeSpan(db.assemblies[subjectAssembly].events);
                if (span) span.end = date; //truncate span to what it would be if it expired at the given date.
                let chekExp = checkReferences(subjectAssembly,span); 
                if (chekExp!= 'ok') return chekExp;
                
                if (object.length) {
                    if (object == subjectAssembly) return "can't expire into yourself";
                    let lf = lifeSpan(db.asssemblies[object].events);
                    if (!lf || lf.begin > date) return object+" doesn't exist yet. Give it some events before "+date+".";
                    if (lf.end < date) return object+" has already expired by "+date+"."
                    object = db.assemblies[object].id;
                } //else object is blank, subjectAssembly is dying, that's ok.
            }
            
            try{ note = nameRefsToIdRefs(note); } catch (e) {return e };  //---------***test this one***
            
            if(doIt) placeValidatedEvent(subjectAssembly,date,verb,object,note);
            return "ok";
        }
    }
    
    function checkGPS(object){
        let numStrArr = object.split(',');
        if (numStrArr.length != 2) return "GPS coordinates are two numbers separated by a comma.";
        let N=parseFloat(numStrArr[0]);
        let E=parseFloat(numStrArr[1]);
        if (!isNumeric(N) || !isNumeric(E)) return "GPS coordinates are two NUMBERS separated by a comma."
        if (N < 33 || N > 47 || E< -85 || E > -77 ) return "Those GPS coordinates are outside our study area. First is Latitude, second is Longitude specified as Easting. In our area, first must be between 33 and 47, and second betweeen -77 and -85. Please copy/paste coordinates from maps.google.com";
        return "ok" ;
    }
    
    function critiqueVerbObject(verb, object){
        switch (verb){
            case "set-locale":
                return checkGPS(object);
            case "set-weight":
                if (object.length && allDigits(object,0,object.length)) return "ok";
                else return "bad weight amount";
            case "set-affiliation":
                if (object == '') return 'ok'; //become unaffiliated
                if (assemblyExists(object)) return "ok";
                else return "unrecognized affiliation assembly name";
            case "photo": 
                if (object.length > 0) return "ok"; //---------------unfinished checkURL??? 
                else return "bad URL";
            case "add-tag":
                if (db.tags.includes(object)) return "ok";
                else return "unrecognized tag";
            case "remove-tag":
                if (db.tags.includes(object)) return "ok";
                else return "unrecognized tag";
            case "see-note":
                if (object.length > 0) return "see-note object should be blank. Put info in note.";
                else return "ok";
            case 'expire-into': 
                if (object.length && !assemblyExists(object)) return 'unrecognized expire-into assembly name';
                else return 'ok'; //it's OK to expire into nothing.
            default: 
                return "verb not recognized";

        }
    }
    
    function allDigits(candidate,start,len){
        const snippet = candidate.substr(start,len);
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
        
        candidate = candidate.trim();
        if (candidate.length == 0) return "date is blank";
        
        if (!allDigits(candidate,0,4)) return "date year is weird. Needs four digits."
        if (candidate.substr(0,4) < "1000" || candidate.substr(0,4) > "3000") return "date year out of range"; 
        if (remainderBlank(4)) return "ok"; // yyyy
        if (candidate.charAt(4) != '/') return "date must have slash between year and month. Think yyyy/mm/dd";
        if (!allDigits(candidate,5,2)) return "date month is wierd";
        if (candidate.substr(5,2)<"01" || candidate.substr(5,2) > "12") return "date format requires two-digit months, like April 1888 is 1888/04"; //months
        if (remainderBlank(7)) return "ok"; // yyyy/mm
        if (candidate.charAt(7) != '/') return "date must have a slash between month and day. Think yyyy/mm/dd ";
        if (!allDigits(candidate,8,2)) return "date requires two-digit days, like 6th Dec 1888 is 1888/12/06";
        //check for 30 days hath september, etc...
        let mm = parseInt(candidate.substr(5,2),10)-1; //Date requires 0 based months
        let d = new Date( parseInt(candidate.substr(0,4),10), mm, parseInt(candidate.substr(8,2),10));
        //Given too many days, like the 29th feb in a non-leap-year month, Date constructor wraps it into the following month...
        if (d.getMonth() != mm) return "That month doesn't have that many days." 
        return "ok"; //yyyy/mm/dd
    }

    //returns modified str
    //replacing each [id] reference with [name] reference
    function idRefsToNameRefs(str){ 
        let refs = str.match(/\[\d+\]/g) ; //returns an array of refs "[d+]" from the strings
        if (!refs) return str;
        refs = refs.map(ref=>cutOffEnds(ref));
        refs.forEach(ref => { if (!idToName[ref]) throw ref+" is an unknown assembly reference.";}) ;
        refs.forEach(ref=> { str = str.replace(ref,idToName[ref]);});
        return str;
    }
    
    //returns modified str
    //replacing each [name] reference with [id] reference
    function nameRefsToIdRefs(str){ //replace each [name] reference with [id] reference
        let refs = str.match(/\[.+?\]/g) ; //returns an array of refs "[xxx]" from the strings
        if (!refs) return str;
        refs = refs.map(ref=>cutOffEnds(ref).trim());
        refs.forEach(ref => { if (!db.assemblies[ref]) throw ref + " is not a known assembly."; });
        refs.forEach(ref=> { str = str.replace(ref,db.assemblies[ref].id);});
        return str;
    }
    
    //returns naiveEvent of dereferenced strings
    function dereferencedEvent(ev){
        return new naiveEvent( ev.date, ev.verb, (ev.verb == "set-affiliation")?idToName[ev.object]:ev.object, idRefsToNameRefs(ev.note));
    }
                         
    //Used for display of list of events.
    //Returns an array of formatted dereferencedEvents corresponding to the events of an assembly
    //the indices of events in this array are valid to use in deleteEvent IFF there have been no addEvents or deleteEvents in between. 
    //So every time you add or delete one, you have to getEventStrings again, so your indices are good.
    function getEventStrings(assemblyName){ 
        
        //flesh out date with trailing blanks to be (at least) len chars long.
        function buff(date,len){ 
            if (len <= date.length) return date;
            else return date + " ".repeat(len-date.length);
        }
        
        function eventToString(ev){
            let sev = dereferencedEvent(ev);
            return buff(sev.date,10) + ' ' + sev.verb + (sev.object.length?(' '+sev.object):'') + (sev.note.length?(" note:"+ sev.note):"");
        }
        
        if (assemblyExists(assemblyName)) {
            return db.assemblies[assemblyName].events.map(ev => eventToString(ev));
        }
        else return [];
    }
    
    function getDereferencedEvent(assemblyName,index){
        if (assemblyExists(assemblyName) && index >=0 && index < db.assemblies[assemblyName].events.length) return dereferencedEvent(db.assemblies[assemblyName].events[index]);
        else return null;
    }
    
    TODO: have data editor expect an ok back from deleteEvent, else popup refusal.
    
    // Deleting first event may change lifeSpan. Need to checkreferences to see if that invalidates any references...
    // (Deleting a (necessarily final) expire-into event enlarges lifeSpan, so that's OK.)
    function deleteEvent(assemblyName,index){
        if (isNumeric(index) && assemblyExists(assemblyName)) {
            if (index == 0) {
                let nuvents = [db.assemblies[assemblyName].events...].shift(); //all save first element
                let chkRef = checkReferences(assemblyName,lifeSpan(nuvents));
                if (chkRef != 'ok') return chkRef;
            }
            db.assemblies[assemblyName].events.splice(index,1); //remove the indexed event
            return 'ok';
        }
    }
    
    //used to initialize db.assemblies from file
    function setData(data){
        db.assemblies = data;
        buildIdToName();
    }
    
    //used to create a file copy of db.assemblies
    function getData(){
        return JSON.stringify(db.assemblies);
    }

    
    
    
    ////--------------------- compilation into states.
    //// This 'batch' job is invalidated by any change to db.assemblies info, i.e. must be redone
    //// The program must end, because events will be inserted artificially which might bother editors.
    //// So alert user if they haven't saved db (dirty bit?), and terminate program
    //// cease responding, kill the interface, redirect, whatever, make the user leave the window
    //// like kill the db!
    
    //Need to add pseudo set-affiliation events to all underlings whenever overlord affiliation changes (or expires), and recur! That will cause affiliations list to be regenereated at that time.??
    
    /*
    Assertions: 
    mostRecentAffiliation(assemblyName,date) is computable, 
    it scans all assemblyName's events whose date <= given date,
    and returns object of most recent set-affiliation event, or "" if none.
    Donc affiliateChainFromMe(myAssemblyName,date) is computable, is array [ mostRecentAffiliation(me,date), mostRecentAffiliation(mostRecentAffiliation(me,date),date)...]
    until "" (top dog has no affiliation). May be [].
    
    Donc affiliateChainThroughMe(myAssemblyName,targetAssemblyName, date) is computable, is array of assemblyNames by which there is an affiliation chain (of mostRecentAffiliations) from targetAssembly including me at the given date, or [] if no such chain exists.
    Bzw I'm on affiliateChainFrom any other assembly at a given date is computable, so I can search through all assemblies and find those affiliated through me at that date.
    Donc when I do a expire-into or a set-affiliation, I can update all my subordinates' affilaitionchains to go through they new guy to the top. I add a compile-time-only event to them, that updates their chain. Also happens when I'm at the bottom of the list, because I compute my own affiliateChainThroughMe, which goes all the way to the top.
    
    */
    
    
    const minDate ='0000'; //least date with four digit yyyy
    const maxDate = '9999/12/31';
    
    /*
    
    //returns affiliation as of the given date, or '' if none.
    function mostRecentAffiliation(events,date){
        var currentAffiliation = '';
        for (var i=0;i<events.length;i++) {
            if (events[i].date > date) break;
            if (events[i].verb == 'set-affiliation') currentAffiliation = events[i].object; //may be ''
        }
        return currentAffiliation;
    }
    
    
    
    //given an array hasDates of events or states or any objects which have a 'date' field, 
    //and i an index thereinto, 
    //return the date of the following item,
    //or maxDate if there is none.
    //assumes 0 <= i < hasDates.length
    function followingDate(hasDates,i){
        if(hasDates.length) {
            if (i>=hasDates.length-1) return maxDate;
            else return hasDates[i+1].date;
        } else return maxDate;
    }
    
    //Used for insertion of a new event of given date into an array of objects ordered by their date field.
    //Returns the index of the event of least date after (>) the given date.
    //Returns events.length if there are no events after the given date, i.e. you can just push
    // event of the given date onto the end of the array (this works when array is empty, too).
    //(Note: if there are events (events.length>0) but all follow the given date,
    //   it of course returns 0, i.e. you should put the new event at the beginning of the array.)
    function indexOfNextEvent(events,date){
        var i=0;
        for (i=0;i<events.length;i++){
            if (events[i].date > date) break;
        }
        return i;
    }
    
    //N.B.: I considered whenever a expirer or 
    
    //insert a compile-time-only update-affiliations event at the (end of) the given date.
    //placeValidatedEvent(assemblyName,date,'update-affiliations','','');
    
   
    function preCompile(){
        
        
        
        function countCoup(assyData){
            assyData.events.forEach(event=> {
                if (event.verb=='set-affiliation' && event.object.length) db.assemblies(idToName[event.object]).count++;
            })
        }
        
        function rememberSetAffiliations(assemblyName){
            db.assemblies[assemblyName].events.forEach(event=>{
                if (event.verb=='set-affiliation') pile.push([event.date,assemblyName]); //don't need objects, which may even be ''
            })
        }
        
        function compareFirsts(arr1,arr2){return (arr1[0] < arr2[0])?-1:((arr1[0] > arr2[0])?1:0);}
        
        //find all assemblies which have never been the targets of set-affiliates
        //create and initialize counts
        Object.values(db.assemblies).forEach(assyData=>assyData.count=0;); 
        Object.values(db.assemblies).forEach(assyData=>countCoup(assyData));
        //those whose counts are still 0 can be ignored, they have no sub-affiliates,
        //so they won't cause any 'update-affiliation' insertions
        
        //make a pile of all set-affiliation events that might cause an update-affiliation
        let pile = []; //of [date, assemblyName] pairs of set-affiliation events
        Object.keys(db.assemblies).forEach(assemblyName=>{
            if (db.assemblies[assemblyName].count) rememberSetAffiliations(assemblyName);
        });
        
        pile.sort(compareFirsts); //pile sorted by date
        
        let keys = Object.keys(db.assemblies);
        pile.forEach([date,superAssemblyName] =>{
            keys.forEach(subAssemblyName => treatSubordinate(subAssemblyName,superAssemblyName,date);
        });
        
        // go through the pile in order, calling treatSubordinate Assembly (total scan of db for each one!!!)
            
        //wait. If we took a greedy approach. If each assy knew the list of everyone it had ever been affiliated to... and all the upstack superassemblies they'd been affiliated too,
        //so set of all possible superaffiliates.. then it could do an update-affiliation any time any of them changed affiliations. basta. Overkill is cheaper, because I never have to rescan whole db.
    //think expirers too!!

        function treatSubordinate(assembly, me ,date){
            if (mostRecentAffiliationChain(assembly,date).includes(me)){ //must include prior precompiled update-affiliation events...
                placeValidatedEvent(assembly,date,'update-affiliations','','');
            }
        }

        
        db.assemblies.keys.forEach(assembly=>treatSubordinate(assembly, me));
    }
    
    //In the following, the states are "unclosed", i.e. affiliation is not yet an array.
    
    function State( date,locale, weight, affiliation, photo, tags, notes) {
        this.date = date;
        this.locale = locale;
        this.weight = weight;
        this.affiliation = affiliation;
        this.photo = photo;
        this.tags = tags;
        this.notes = notes;
    }
    
    function virginState(){
        return new State(minDate(),null,0,'','',[],[]); //affiliation starts as single string, later becomes an array
    }
    
    function copyState(state){
        return new State(state.date, state.locale, state.weight, state.affiliation, state.photo, [...state.tags], [...state.notes]);
    }
    
    //edits the given state based on the given event
    // note ([] == false) is true, as is ('' == false)
    function editState(state,event){
        switch(event.verb){
            case 'set-locale':
                state.locale = swapCoordinates(event.object); //replaces
                break;
            case 'set-weight':
                state.weight = event.object; //replaces
                break;
            case 'set-affiliation':
                state.affiliation = event.object; //replaces, can be ''
                break;
            case 'photo':
                state.photo = event.object; //replaces
                break;
            case 'add-tag':
                //remove duplicates
                state.tags = state.tags.filter(tag => tag != event.object); //a set of tags
                state.tags.push(event.object);
                break;
            case 'remove-tag':
                state.tags = state.tags.filter(tag => tag != event.object);
                break;
            case 'see-note':
                state.note = event.note; //replaces
                break;
            case 'expire...
        }
        if (event.note && event.note.length) state.notes.push(event.note);
        state.date = event.date;
        return state;
    }
    
    function makeAllUnclosedStates(){
        
        function makeUnclosedStates(assemblyName){
            let s =[]; 
            let events = db.assemblies[assemblyName].events;
            if (events.length) {
                let state = virginState();
                events.forEach((event,index) => {
                    editState(state,event); //evolve the state
                    if (index==events.length-1 || events[i+1].date != event.date) s.push(copyState(state)); //only push when done with identical dates
                    //else, as long as date stays same, condinue editing same state. 
                    //Can accumulate multiple notes, multiple tags,
                    //but not multiple photos, affiliations, locales, or weights -- last one wins
                });
            }
            db.assemblies[assemblyName].states=s; //add to assemblyData
        }
        
        Object.keys(db.assemblies).forEach(assemblyName => makeUnclosedStates(assemblyName));
    }
    
    
    function makeStates(){
        makeAllUnclosedStates();
        // if you have subordinates when you set-affiliation, 
        //insert a state at that date in each subordinate carrying
        //...and recompact with those of same date... is horrible
        
    }
    
    */
    
    return {cutOffEnds:cutOffEnds,
            yearLater:yearLater,
        
            getVerbs:getVerbs,
        
            getData:getData,
            setData:setData,
            
            getTags:getTags,
            setTags:setTags,
            
            getAllAssemblyNames:getAllAssemblyNames,
            getMennoniteAssemblyNames:getMennoniteAssemblyNames,
            getBrethrenAssemblyNames:getBrethrenAssemblyNames,
            getNeitherAssemblyNames:getNeitherAssemblyNames,
            getJointAssemblyNames:getJointAssemblyNames,
            getDenomination:getDenomination,
            assemblyExists:assemblyExists,
            addAssembly:addAssembly,
            changeAssembly:changeAssembly,
            deleteAssembly:deleteAssembly,
            
            addEvent:addEvent,
            getDereferencedEvent:getDereferencedEvent,
            getEventStrings:getEventStrings,
            deleteEvent:deleteEvent,
            
            //temporary, for testing only
            db:db
           };

}