/* 
BMHC.js

version 0.11 Copyright 2021 John R C Fairfield, see MIT License

*/

function BMHCobj(){
    
    const brethren  = 1;
    const mennonite = 2;
    // 0 neither, 3 both
    // name:val pairs, in names no double quotes, no ampersand. Blanks, Apostrophe are OK
    
    const minDate ='0001'; //least truthy date with four digit yyyy
    const maxDate = '9999/12/31';
    
    function bmhcDatabase(){
        this.idSource = 13; //source of unique ids for both assemblies and events
        this.verbs = ["begin-history", "set-locale", "set-weight", "set-affiliation", "set-photo", "add-tag", "remove-tag", "just-comment", "expire-into"]; //maintain parallel to critiqueVerbObject() and bmhcMapDisplay.html
        this.tags = [];
        this.assemblies = {}; //a dictionary of assemblyData, the keys being assembly names
    }
    
    const db = new bmhcDatabase(); //see setData
    
    let idToName = {}; //a dictionary of numeric id:string assemblyName pairs, 
    // not necessarily sorted if we merge concurrent access files...
    
    //the reason for ids, and idToName, is so one can change the name of an assembly
    //and all the stored object and comment ids do NOT have to change.
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
    
    //only works with valid dates, though oldDate may be null (anything falsy)
    function yearLater(oldDate, date){
        let yr = parseInt(date);
        let delta = 1;
        
        if (oldDate){
            let oldYr = parseInt(oldDate);
            delta = yr-oldYr;
            if (delta > 50) delta = 1;
            else if (delta < -50) delta = 1;
        }
        
        return (yr+delta).toString() + date.substr(4);
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
    
    //returns false if name is null
    function assemblyExists(name){
        return (name in db.assemblies);
    }
    
    //given an array of Objects having a .date field
    function lifeTime(events){
        if (events.length)
            return { begin: events[0].date, 
                     end: (events[events.length-1].verb == 'expire-into')?events[events.length-1].date:maxDate };
        else return null;
    }
    
    function assemblyLifeTime(name) { 
        if (assemblyExists(name)) return lifeTime(db.assemblies[name].events);
        else return null;
    }
    
    function lastEvent(name){
        if (assemblyExists(name)) {
            let len = db.assemblies[name].events.length;
            if (len) return db.assemblies[name].events[len-1];
        }
        return null; //assembly doesn't exist, or has no events
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
        //const re = new RegExp('\['+id+'\]','g');
        
        function filterObjectReferences(assembly){
            db.assemblies[assembly].events = db.assemblies[assembly].events.filter(event =>{
                if ((event.verb == "set-affiliation" || event.verb == "expire-into") && event.object == id ){count++; return false;}
                else return true;
            });
        }
        
        function clobberCommentReferences(assembly){
            db.assemblies[assembly].events.forEach(event =>{ 
                //let c = (event.comment.match(re) || []).length; //match can return null
                //if (c) event.comment = event.comment.replaceAll('['+id+']',"???"); 
                let nuComment = event.comment.replaceAll('['+id+']',"???");
                if (event.comment != nuComment){event.comment = nuComment; count++;} //undercounts if more than one, tant pis
            });
        }
    
        //scan and remove set-affiliation events whose objIds == id, maintaining order of events
        Object.keys(db.assemblies).forEach(assembly => { 
            filterObjectReferences(assembly); 
            clobberCommentReferences(assembly);
        });
        
        return count;
    }
    
    //returns the number of invalidated references that have been removed
    function deleteAssembly(name){
        if (!assemblyExists(name)) return -1;
        //tosses assembly and its assemblyData, including all events therein.
        const id = db.assemblies[name].id;
        delete db.assemblies[name];
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
    // Since the array index number of a given event can be changed by addition or deletion of other events,
    // the index number of a given event can only identify the event in read operations, not in write operations.
    
    function naiveEvent(date,verb,object,comment=''){
        this.date = date;
        this.verb = verb;
        this.object = object;
        this.comment = comment;
    }
    
    function sortEvents(events){
        function compareDates(e1,e2){return (e1.date < e2.date)?-1:((e1.date > e2.date)?1:0);}
        events.sort(compareDates);
    }
    
    
    function placeEvent(events,date, verb,object,comment){
        events.push(new naiveEvent(date,verb,object,comment));
        sortEvents(events);
    }

    
    // ---------------  checkEvent functions  -------------------------
    // I made them independent so that I know there are no extraneous references global to checkEvent,
    // i.e. so I know what all their parameters really are
    
    //A date 
    //is "yyyy      "
    //or "yyyy/mm   "
    //or "yyyy/mm/dd"
    //boolean
    function checkDateFormat(candidate){

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
    
    function checkGPS(coord){
        let numStrArr = coord.split(',');
        if (numStrArr.length != 2) return "GPS coordinates are two numbers separated by a comma.";
        let N=parseFloat(numStrArr[0]);
        let E=parseFloat(numStrArr[1]);
        if (!isNumeric(N) || !isNumeric(E)) return "GPS coordinates are two NUMBERS separated by a comma."
        if (N < -90 || N > 90 || E < -180 || E > 180 ) return "Those GPS coordinates are invalid. First should be Latitude (from -90 to +90), second is Longitude specified as Easting (from -180 to +180). In the eastern US, first should be between 25 and 48, and second betweeen -67 and -89. The simplest is to copy/paste coordinates from maps.google.com";
        return "ok" ;
    }
    

    //boolean, true if there is a circular reference, false if there is not.
    //this is simplified, and finds more loops than would be warranted if it considered dates. 
    //But it's ok to be heavy handed since such loops are not going to happen historically
    //unless someone is playing games or makes a mistake.
    function cyclicRefDFS(name, events, stack=[]){
        //name must not already be in stack. Events is presumed to be db.assemblies[name].events
        stack.push(name);
        for (let i=0;i<events.length;i++){
            let event = events[i];
            if ((event.verb == 'expire-into' || event.verb == 'set-affiliation') && event.object != '') {
                let objName = idToName[event.object];
                if (stack.includes(objName)) return true;
                if (cyclicRefDFS(objName,db.assemblies[objName].events,stack)) return true;
            }
        }
        stack.pop();
        return false; //all's well
    }
    
    function critiqueVerbObject(subject,date,verb,object){
            
        function checkObjectAnachronism(object,date){
            if (!assemblyExists(object)) return "there is no assembly named "+object;
            let lt = lifeTime(db.assemblies[object].events);
            if (lt==null || (lt.begin > date || lt.end < date)) return "assembly "+object+" doesn't exist at this date ("+date+")";
            return 'ok';
        }
        
        function checkRef(subject, verb, object){
            if (object.length) {
                    //note: object is not yet in db.assemblies[subject].events, it is under consideration but not yet added
                    //if (subject == object) return "An assembly can't reference itself";
                    if (!assemblyExists(object)) return 'There is no assembly named '+object;
                    let objId = db.assemblies[object].id;
                    let nuvents = [...(db.assemblies[subject].events)];
                    nuvents.push( new naiveEvent(minDate,verb,objId));
                    //a pseudo event pushed on to mimic the proposed event. 
                    //For heavyhanded cyclicRefDFS, dates and the order of events are irrelevant
                    if (cyclicRefDFS(subject, nuvents)) return "circular references are forbidden";
                    else return checkObjectAnachronism(object,date);
            } else return 'ok'; // '' is ok, can become unafffiliated, or expire-into nothing.
        }
        
        switch (verb){
            case "begin-history":
                if (object.length > 0) return "begin-history object should be blank. Put info in comment."
                return 'ok';
            case "set-locale":
                return checkGPS(object);
            case "set-weight":
                if (object.length && allDigits(object,0,object.length)) return "ok";
                return "bad weight amount";
            case "set-affiliation":
                return checkRef(subject,verb,object);
            case "set-photo": 
                if (object.length > 0) return "ok"; //---------------unfinished checkURL??? 
                return "bad URL";
            case "add-tag":
                if (db.tags.includes(object)) return "ok";
                return "unrecognized tag";
            case "remove-tag":
                if (db.tags.includes(object)) return "ok";
                return "unrecognized tag";
            case "just-comment":
                if (object.length > 0) return "just-comment object should be blank. Put info in comment.";
                return "ok";
            case 'expire-into': 
                return checkRef(subject,verb,object);
            default: 
                return "verb not recognized";

        }
    }
    
    //does total scan of db searching for references to subject outside the given lifeTime.
    //If lifeTime is null, any reference to subject is illegit. 
    function checkReferences(subject, lifeTime){

        var subjectId = db.assemblies[subject].id;

        //if in other assemblies there are set-affiliation or expire-into events outside my lifeTime, complain!
        //total scan of db! NOTE: can't 'return' (or break) from a "forEach", so I use oldfashioned loops

        var names = Object.keys(db.assemblies);

        for (let i=0; i<names.length; i++){ 
            let name = names[i]; 
            if (name!=subject){ //skip myself
                let events = db.assemblies[name].events;
                for (let j=0; j<events.length; j++) {
                    let event = events[j];
                    if (event.object == subjectId && (event.verb == 'set-affiliation' || event.verb == 'expire-into')){
                        if (!lifeTime || event.date < lifeTime.begin || event.date > lifeTime.end) return name+" has a "+event.verb+" event referring to "+subject+" that is dated "+event.date+". Please fix.";
                    }
                }
            }
        }

        return 'ok';
    }
    
    //total scan of db
    //checks validity of an events array
    function checkEvents(subject, events){
            
        for (let i=1;i<events.length;i++) if (events[i].date < events[i-1].date) return 'Error: events out of order, please notify administrator';
        if (events.length && events[0].verb != 'begin-history') return 'first event must be begin-history';
        for (let i=1;i<events.length;i++) if (events[i].verb == 'begin-history') return 'only the first event may be begin-history';
        for (let i=1;i<events.length-1;i++) if (events[i].verb == 'expire-into') return 'there can only be one expire-into, which must be the last event';

        //total scan of db
        return checkReferences(subject,lifeTime(events)); 
    }
    
    
    // date, verb, object, comment must already be trimmed,
    // references in comment must already be in [id] rather than [name], and
    // if verb is set-afiliation or expire-into, object must already be in id, not in name.
    function newEventsArray(events, eventIndex, date,verb,object,comment){
        let nuvents = [ ...events];
        if (eventIndex == null) { // Issue is events having the same date as begin-history and/or expire-into.
            //Will be sorted by date before verification by checkEvents, 
            //but sort preserves insertion order when dates are identical.
            //So policy is to add to end, 
            //unless end is already an expire-into
            //in which case you want to add before the expire-into.
            nuvents.push(new naiveEvent(date,verb,object,comment)); //on the end
            if (nuvents.length >1 && nuvents[nuvents.length-1].verb == "expire-into") { //swap last two
                let swap = nuvents[nuvents.length-1];
                nuvents[nuvents.length-1] = nuvents[nuvents.length-2];
                nuvents[nuvents.length-2] = swap;
            }
        } else { 
            let ev = nuvents[eventIndex];
            ev.date = date; 
            ev.verb = verb; 
            ev.object = object; 
            ev.comment = comment;
        }
        sortEvents(nuvents);
        return nuvents;
    }
    
    //returns "ok" or an error statement
    //date,verb,object,comment must already be trimmed.
    //if eventIndex == null, check is for adding the event given in the remaining parameters.
    //Otherwise, checks for replacing db.assemblies[subjectAssembly].events[eventIndex] with the given event.
    function checkEvent(subjectAssembly,eventIndex,date,verb,object,comment){ 
        
        if (!assemblyExists(subjectAssembly)) return "subject assembly '"+subjectAssembly+"' doesn't exist";
        
        let events=db.assemblies[subjectAssembly].events;
        
        if (eventIndex != null && (!isNumeric(eventIndex) || eventIndex < 0 || eventIndex >= events.length)) return 'invalid event index '+eventIndex ;
        if (checkDateFormat(date)!="ok") return checkDateFormat(date);
        let nok = critiqueVerbObject(subjectAssembly,date,verb,object);
        if (nok != "ok") return nok;
        
        try{ comment = nameRefsToIdRefs(comment); } catch (e) {return e };  //---------***test this one***
        if (object.length && (verb=='set-affiliation' || verb=='expire-into')) object = db.assemblies[object].id; //critiqueVerbObject has already verified ok
        return checkEvents(subjectAssembly,newEventsArray(events,eventIndex,date,verb,object,comment));
    }
    
    
    // ---------------------- adding, deleting, editing events ----------------------
    
    
    //replaces db.assemblies[assemblyName].events[eventIndex] with the given event information.
    //if eventIndex==null, adds the given event as a new event.
    function setEvent(assemblyName, eventIndex, date, verb, object, comment){
        
        assemblyName = assemblyName.trim(); 
        date = date.trim();
        verb = verb.trim();
        object = object.trim();
        comment = comment.trim();
        
        let ce = checkEvent(assemblyName,eventIndex,date,verb,object,comment);
        if (ce != 'ok') return ce;
        
        comment = nameRefsToIdRefs(comment); //already verified ok
        if (object.length && (verb=='set-affiliation' || verb=='expire-into')) object = db.assemblies[object].id; //already verified ok
        db.assemblies[assemblyName].events = newEventsArray(db.assemblies[assemblyName].events,eventIndex,date,verb,object,comment);
        
        return 'ok';
    }
    
    
    function deleteEvent(assemblyName,index){
        if (!assemblyExists(assemblyName)) return "That assembly doesn't exist";
        
        if (isNumeric(index) && index >=0 && index < db.assemblies[assemblyName].events.length) {
            
            if (index == 0 && db.assemblies[assemblyName].events.length > 1) return "You can't DELETE the begin event until you've first deleted all other events. You could EDIT the begin event, if you want to shift its date or add a comment.";
            
            if (index==0) {
                let chk = checkReferences(assemblyName, null); 
                if (chk != 'ok') return chk;
            } //deletion of any other event than begin-history does not contract the lifeTime, so no need to checkReferences
            
            db.assemblies[assemblyName].events.splice(index,1); //remove the indexed event
            //has stayed sorted
            return 'ok';
            
        } else return 'bad event index';
    }
    
    
    // ------------------------------- getEventStrings --------------------------
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
    
    
    function allDigits(candidate,start,len){
        const snippet = candidate.substr(start,len);
        if ( snippet.length != len) return false;
        return /^\d+$/.test(snippet);
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
    
    
    //returns naiveEvent of dereferenced strings
    function dereferencedEvent(ev){
        return new naiveEvent( ev.date, ev.verb, (ev.verb == "set-affiliation" || ev.verb == 'expire-into')?idToName[ev.object]:ev.object, idRefsToNameRefs(ev.comment));
    }
                         
    //Used for display of list of events.
    //Returns an array of formatted dereferencedEvents corresponding to the events of an assembly
    //the indices of events in this array are valid to use in deleteEvent IFF there have been no setEvents or deleteEvents in between. 
    //So every time you add or delete one, you have to getEventStrings again, so your indices are good.
    function getEventStrings(assemblyName){ 
        
        //flesh out date with trailing blanks to be (at least) len chars long.
        function buff(date,len){ 
            if (len <= date.length) return date;
            else return date + " ".repeat(len-date.length);
        }
        
        function eventToString(ev){
            let sev = dereferencedEvent(ev);
            return buff(sev.date,10) + ' ' + sev.verb + (sev.object.length?(' '+sev.object):'') + (sev.comment.length?(" comment:"+ sev.comment):"");
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
    
    
    //used to initialize db.assemblies from file
    function setData(data){
        db.idSource = data.idSource;
        db.assemblies = data.assemblies;
        buildIdToName();
    }
    
    //used to create a file copy of db.assemblies
    function getData(){
        return '{"idSource":' + db.idSource + ',"assemblies":' + JSON.stringify(db.assemblies) + '}';
    }

    function wrapDataInJS(){
        return "function bmhcData(){ return "+getData()+"; }" ;
    }
    
    
    
    //--------------------- compilation of accellerators -----------------------------
    
   //The state of an assembly at date D includes the current affiliationChain which is dynamically computed.
    
    //returns affiliation as of the given date, or '' if none.
    //note that if an assembly expires into another (for a renaming or merger)
    //then post-merger the new one's affiliation holds as the affiliation of the old.
    //The people moved into another institution, and we're tracking those peoples' affiliation.
    function mostRecentAffiliation(events,date){
        var currentAffiliationId = '';
        for (var i=0;i<events.length;i++) {
            if (events[i].date > date) break;
            if (events[i].verb == 'set-affiliation') currentAffiliationId = events[i].object; //may be ''.
            if (events[i].verb == 'expire-into'){
                if (events[i].object == '') return '';
                else return mostRecentAffiliation(db.assemblies[idToName[events[i].object]].events, date); //you became the new identity. We fear no circularity, that was excluded during data entry.
            }
        }
        if (currentAffiliationId == '') return '';
        else return idToName[currentAffiliationId];
    }
    
    //name and date must be validated beforehand, does not check. Normal top level call omits third parm.
    //returns an array of the ascending affiliations the named assembly, at the given date
    function affiliationChain(name, date, chain=[]){
        var mra = mostRecentAffiliation(db.assemblies[name].events,date);
        if (mra == '') return chain;
        else {
            chain.push(mra);
            return affiliationChain(mra,date,chain); //no circularity possible, was excluded in data entry.
        }
    }
    
    //colors may depend on affiliationChain, size of display on weight (use sqrt?), position on most recent locale.
    //first version will try to just compute all of those all the time, without any accellerator.
    
    /*
    
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
    //placeEvent(db.assemblies[assemblyName].events,date,'update-affiliations','','');
    
   
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
            
        //wait. If we took a greedy approach. If each assy knew the list of everyone it had ever been affiliated to... and all the upstack superassemblies they'd been affiliated to,
        //so set of all possible superaffiliates.. then it could do an update-affiliation any time any of them changed affiliations. basta. Overkill is cheaper, because I never have to rescan whole db.
    //think expirers too

        function treatSubordinate(assembly, me ,date){
            if (mostRecentAffiliationChain(assembly,date).includes(me)){ //must include prior precompiled update-affiliation events...
                placeEvent(db.assemblies[assembly].events,date,'update-affiliations','','');
            }
        }

        
        db.assemblies.keys.forEach(assembly=>treatSubordinate(assembly, me));
    }
    
    //In the following, the states are "unclosed", i.e. affiliation is not yet an array.
    
    function State( date,locale, weight, affiliation, photo, tags, comments) {
        this.date = date;
        this.locale = locale;
        this.weight = weight;
        this.affiliation = affiliation;
        this.photo = photo;
        this.tags = tags;
        this.comments = comments;
    }
    
    function virginState(){
        return new State(minDate(),null,0,'','',[],[]); //affiliation starts as single string, later becomes an array
    }
    
    function copyState(state){
        return new State(state.date, state.locale, state.weight, state.affiliation, state.photo, [...state.tags], [...state.comments]);
    }
    
    //edits the given state based on the given event
    //Note ([] == false) is true, as is ('' == false)
    function editState(state,event){
        switch(event.verb){
            case 'set-locale':
                state.locale = swapCoordinates(event.object); //replaces
                break;
            case 'set-weight':
                state.weight = event.object; //replaces
                break;
            //case 'set-affiliation': can't accellerate
            //  break;
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
            //case 'just-comment':
            //    break;
            case 'expire-into':
        }
        if (event.comment && event.comment.length) state.comments.push(event.comment);
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
                    //Can accumulate multiple comments, multiple tags,
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
    
    return {
            maxDate:maxDate,
            minDate:minDate,
        
            cutOffEnds:cutOffEnds,
            yearLater:yearLater,
        
            getVerbs:getVerbs,
        
            wrapDataInJS:wrapDataInJS,
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
            
            setEvent:setEvent,
            deleteEvent:deleteEvent,
            getDereferencedEvent:getDereferencedEvent,
            getEventStrings:getEventStrings,
        
            assemblyLifeTime:assemblyLifeTime,
        
            mostRecentAffiliation:mostRecentAffiliation,
            affiliationChain:affiliationChain,

            //temporary, for testing only
            db:db
           };

}