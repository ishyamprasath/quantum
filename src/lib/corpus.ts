import type { Complaint } from "./types";

/**
 * 100 hand-labelled municipal complaints in the shape a Coimbatore ward office
 * receives them: WhatsApp forwards, portal submissions, emails and phone notes.
 *
 * Labelling protocol
 * ------------------
 *  - `group`  : the real-world incident. Two complaints share a group id only if
 *               dispatching one crew once would close both. 14 incidents were
 *               reported more than once; the rest are unique.
 *  - `dept`   : the desk that actually owns the fix. `unclear` means a human
 *               reader could not route it either -- these exist on purpose, and
 *               the model is scored on whether it abstains on them.
 *  - `urgency`: P1 act today (safety or health), P2 act this week (service
 *               failure), P3 routine.
 *
 * Text is written in the register complaints actually arrive in, including
 * transliterated Tamil, missing punctuation and misspellings. Nothing here is
 * cleaned up to make the model look better.
 */
export const CORPUS: Complaint[] = [
  // ---- G01 - pothole at Gandhipuram bus stand junction -------------------
  { id: "C001", ward: "Ward 48", channel: "whatsapp", gold: { dept: "roads", group: "G01", urgency: "P1" },
    text: "Very big pothole right at the Gandhipuram bus stand junction near the signal. Two wheelers are skidding into it every day, yesterday one girl fell down. Please fill it urgently." },
  { id: "C002", ward: "Ward 48", channel: "portal", gold: { dept: "roads", group: "G01", urgency: "P1" },
    text: "Road damage complaint: deep crater on the main carriageway at Gandhipuram bus terminus signal. Depth is nearly one foot. Bike riders are losing balance. Needs immediate patch work." },
  { id: "C003", ward: "Ward 48", channel: "phone", gold: { dept: "roads", group: "G01", urgency: "P1" },
    text: "Caller reports large pit on road opposite Gandhipuram bus stand. Says two accidents in one week. Wants engineer to inspect today." },
  { id: "C004", ward: "Ward 48", channel: "whatsapp", gold: { dept: "roads", group: "G01", urgency: "P1" },
    text: "gandhipuram bus stop signal la periya pothole irukku, scooter la poravanga fall aaguranga. romba danger. pls fix" },
  { id: "C005", ward: "Ward 48", channel: "email", gold: { dept: "roads", group: "G01", urgency: "P1" },
    text: "Sir, I travel daily through the Gandhipuram bus stand signal and there is a dangerous hole in the tar road at the junction. It has grown bigger after last week rain. Kindly arrange to close it before someone is seriously hurt." },

  // ---- G02 - street light out, Cross Cut Road ----------------------------
  { id: "C006", ward: "Ward 52", channel: "whatsapp", gold: { dept: "lighting", group: "G02", urgency: "P2" },
    text: "Street light in front of Cross Cut Road near the mall is not glowing for the past 3 weeks. Whole stretch is dark at night." },
  { id: "C007", ward: "Ward 52", channel: "portal", gold: { dept: "lighting", group: "G02", urgency: "P2" },
    text: "Street lamp not working on Cross Cut Road, near Fun Mall stretch. Reported once earlier in the portal, still not attended. Ladies walking back from work at 9pm feel unsafe." },
  { id: "C008", ward: "Ward 52", channel: "phone", gold: { dept: "lighting", group: "G02", urgency: "P2" },
    text: "Complaint about non functioning street lamp on Cross Cut Road opposite the mall entrance. Bulb fused. Requesting replacement." },
  { id: "C009", ward: "Ward 52", channel: "whatsapp", gold: { dept: "lighting", group: "G02", urgency: "P2" },
    text: "cross cut road light off pannirukku one month aachu. night la romba dark. yaaravathu vandhu paarunga" },

  // ---- G03 - bin overflowing, RS Puram Sivan Kovil Street ----------------
  { id: "C010", ward: "Ward 40", channel: "whatsapp", gold: { dept: "waste", group: "G03", urgency: "P2" },
    text: "The garbage bin at Sivan Kovil Street RS Puram is fully overflowing. Waste is on the road and cows are eating from it. Please send the lorry." },
  { id: "C011", ward: "Ward 40", channel: "portal", gold: { dept: "waste", group: "G03", urgency: "P2" },
    text: "Solid waste complaint. Community bin at Sivan Kovil Street, R.S. Puram has not been cleared for four days. Rubbish is spilling out on both sides and the smell is terrible." },
  { id: "C012", ward: "Ward 40", channel: "email", gold: { dept: "waste", group: "G03", urgency: "P2" },
    text: "Respected Sir, the dustbin near the Sivan temple on Sivan Kovil Street in RS Puram is completely full and garbage is scattered around it. Residents of the street request early clearance." },
  { id: "C013", ward: "Ward 40", channel: "whatsapp", gold: { dept: "waste", group: "G03", urgency: "P2" },
    text: "sivan kovil street rs puram bin overflow aagiduchu, kuppai ellam road la kidakku. lorry anuppunga please" },
  { id: "C014", ward: "Ward 40", channel: "phone", gold: { dept: "waste", group: "G03", urgency: "P2" },
    text: "Resident called about uncollected garbage heap next to the bin at Sivan Kovil Street RS Puram. Says the same bin was overflowing last month too." },

  // ---- G04 - sewage overflow, Ukkadam market road ------------------------
  { id: "C015", ward: "Ward 61", channel: "whatsapp", gold: { dept: "sewerage", group: "G04", urgency: "P1" },
    text: "Sewage water is overflowing from the manhole near Ukkadam market and flowing on the road. Shop people and customers are walking through it. Very unhygienic." },
  { id: "C016", ward: "Ward 61", channel: "portal", gold: { dept: "sewerage", group: "G04", urgency: "P1" },
    text: "Underground drainage overflow at Ukkadam market road. Drain water has come up through the manhole and stagnated across the road. Risk of infection to vendors and public. Urgent." },
  { id: "C017", ward: "Ward 61", channel: "phone", gold: { dept: "sewerage", group: "G04", urgency: "P1" },
    text: "Caller from Ukkadam reports drainage block causing sewage to flow out onto the market road for two days. Requests jetting machine." },
  { id: "C018", ward: "Ward 61", channel: "email", gold: { dept: "sewerage", group: "G04", urgency: "P1" },
    text: "The UGD line near Ukkadam market has choked and dirty sewage is coming out of the manhole onto the public road. It is a serious health hazard for the vegetable vendors sitting there. Please depute staff immediately." },

  // ---- G05 - no water 4 days, Saibaba Colony 5th Street ------------------
  { id: "C019", ward: "Ward 33", channel: "whatsapp", gold: { dept: "water", group: "G05", urgency: "P1" },
    text: "No drinking water supply in 5th Street Saibaba Colony for the last four days. We are buying cans daily. Elderly people in the street are struggling." },
  { id: "C020", ward: "Ward 33", channel: "portal", gold: { dept: "water", group: "G05", urgency: "P1" },
    text: "Water supply complaint: 5th Street, Saibaba Colony has received no corporation water since Monday. Entire street of about 30 houses affected. Request restoration on priority." },
  { id: "C021", ward: "Ward 33", channel: "phone", gold: { dept: "water", group: "G05", urgency: "P1" },
    text: "Resident of Saibaba Colony 5th Street called to say the street has been without piped water for four days and tanker has not come either." },
  { id: "C022", ward: "Ward 33", channel: "whatsapp", gold: { dept: "water", group: "G05", urgency: "P1" },
    text: "saibaba colony 5th street la 4 naala thanni varala. tanker um varala. vayasana aatkal romba kashtapaduranga" },

  // ---- G06 - open manhole, Peelamedu signal -----------------------------
  { id: "C023", ward: "Ward 21", channel: "whatsapp", gold: { dept: "sewerage", group: "G06", urgency: "P1" },
    text: "Manhole cover is missing near the Peelamedu signal. It is a big open hole in the middle of the road. Someone put a branch in it as warning. Children cross here to school." },
  { id: "C024", ward: "Ward 21", channel: "portal", gold: { dept: "sewerage", group: "G06", urgency: "P1" },
    text: "Open manhole without slab on the road at Peelamedu junction. No barricade. Two wheeler could go straight into it at night. Please cover immediately." },
  { id: "C025", ward: "Ward 21", channel: "phone", gold: { dept: "sewerage", group: "G06", urgency: "P1" },
    text: "Urgent call: uncovered manhole at Peelamedu signal, cover appears stolen. Caller has placed stones around it. Wants cover replaced today." },

  // ---- G07 - mosquito breeding, Singanallur ----------------------------
  { id: "C026", ward: "Ward 72", channel: "portal", gold: { dept: "health", group: "G07", urgency: "P2" },
    text: "Stagnant water has collected in the vacant plot near Singanallur tank and mosquitoes are breeding heavily. Two dengue cases already in our street. Request fogging." },
  { id: "C027", ward: "Ward 72", channel: "whatsapp", gold: { dept: "health", group: "G07", urgency: "P2" },
    text: "Mosquito menace near Singanallur lake side. Water is standing in the empty plot for weeks. No fogging done in our area for months. Please do spraying." },
  { id: "C028", ward: "Ward 72", channel: "email", gold: { dept: "health", group: "G07", urgency: "P2" },
    text: "Sir, near the Singanallur lake bund there is an unused plot where rain water has stagnated and it has become a mosquito breeding ground. Fever cases are increasing. Kindly arrange anti larval spraying." },

  // ---- G08 - fallen tree, Vadavalli --------------------------------------
  { id: "C029", ward: "Ward 07", channel: "whatsapp", gold: { dept: "parks", group: "G08", urgency: "P1" },
    text: "A huge tree has fallen across the road at Vadavalli main road after last night rain. Road is completely blocked, ambulance could not pass this morning." },
  { id: "C030", ward: "Ward 07", channel: "phone", gold: { dept: "parks", group: "G08", urgency: "P1" },
    text: "Tree fall reported at Vadavalli. Trunk lying across full width of road, traffic diverted. Requesting tree cutting crew urgently." },
  { id: "C031", ward: "Ward 07", channel: "portal", gold: { dept: "parks", group: "G08", urgency: "P1" },
    text: "Uprooted tree blocking Vadavalli main road since early morning. Branches also touching the electric line. Please remove on emergency basis." },

  // ---- G09 - shed encroaching footpath, Town Hall ------------------------
  { id: "C032", ward: "Ward 55", channel: "portal", gold: { dept: "planning", group: "G09", urgency: "P3" },
    text: "A shop near Town Hall has put up a permanent shed on the footpath. Pedestrians have to step down onto the road to walk past it. Request removal of encroachment." },
  { id: "C033", ward: "Ward 55", channel: "email", gold: { dept: "planning", group: "G09", urgency: "P3" },
    text: "Encroachment complaint: the pavement in front of the shops at Town Hall area has been occupied by an extended tin shed. This is public footpath and should be cleared." },
  { id: "C034", ward: "Ward 55", channel: "whatsapp", gold: { dept: "planning", group: "G09", urgency: "P3" },
    text: "town hall pakkathula kadai kaaranga footpath la shed pottrukanga, nadakave mudiyala. remove pannunga" },

  // ---- G10 - muddy water, Ganapathy --------------------------------------
  { id: "C035", ward: "Ward 15", channel: "whatsapp", gold: { dept: "water", group: "G10", urgency: "P1" },
    text: "Water coming in the tap at Ganapathy 2nd street is brown and muddy with a bad smell. We cannot even use it for washing. Children have stomach upset." },
  { id: "C036", ward: "Ward 15", channel: "portal", gold: { dept: "water", group: "G10", urgency: "P1" },
    text: "Contaminated water supply at Ganapathy area. The supplied water is turbid and smells of drainage, suspect the drinking line has mixed with the sewer line. Health risk." },
  { id: "C037", ward: "Ward 15", channel: "phone", gold: { dept: "water", group: "G10", urgency: "P1" },
    text: "Complaint of dirty drinking water in Ganapathy 2nd street. Caller says water is muddy since three days and two family members have fever." },

  // ---- G11 - broken footpath, Race Course --------------------------------
  { id: "C038", ward: "Ward 44", channel: "portal", gold: { dept: "roads", group: "G11", urgency: "P2" },
    text: "The footpath slabs along Race Course road are broken and several are missing. Walkers are tripping over the gaps, especially in the evening." },
  { id: "C039", ward: "Ward 44", channel: "whatsapp", gold: { dept: "roads", group: "G11", urgency: "P2" },
    text: "Race course walking path cement slabs are cracked and lifted. Old people who come for morning walk are stumbling. Please repair the pavement." },
  { id: "C040", ward: "Ward 44", channel: "email", gold: { dept: "roads", group: "G11", urgency: "P2" },
    text: "Kindly note that the pedestrian pavement on Race Course Road has damaged and dislodged slabs at many places. It is a hazard for the large number of walkers using it daily." },

  // ---- G12 - whole lane dark, Kavundampalayam ----------------------------
  { id: "C041", ward: "Ward 03", channel: "whatsapp", gold: { dept: "lighting", group: "G12", urgency: "P2" },
    text: "Not a single street light is switching on in 3rd Street Kavundampalayam. The entire lane is pitch dark from 7pm. This has been going on for ten days." },
  { id: "C042", ward: "Ward 03", channel: "portal", gold: { dept: "lighting", group: "G12", urgency: "P2" },
    text: "All street lamps in Kavundampalayam 3rd Street are non functional, appears the whole feeder line is off. Residents are afraid to step out after dark." },
  { id: "C043", ward: "Ward 03", channel: "phone", gold: { dept: "lighting", group: "G12", urgency: "P2" },
    text: "Caller reports complete street lighting failure in 3rd street Kavundampalayam for over a week. Suspects switch box problem, asks for lineman visit." },

  // ---- G13 - dead dog, Thudiyalur ----------------------------------------
  { id: "C044", ward: "Ward 02", channel: "whatsapp", gold: { dept: "health", group: "G13", urgency: "P1" },
    text: "A dead dog is lying on the roadside at Thudiyalur bus stop since yesterday. It is rotting and the smell is unbearable, flies everywhere. Please remove it." },
  { id: "C045", ward: "Ward 02", channel: "phone", gold: { dept: "health", group: "G13", urgency: "P1" },
    text: "Carcass removal request. Dead street dog near Thudiyalur bus stand, decomposing on the pavement. Public health nuisance." },
  { id: "C046", ward: "Ward 02", channel: "portal", gold: { dept: "health", group: "G13", urgency: "P1" },
    text: "An animal carcass has been left on the road margin at Thudiyalur for two days now. Nobody has come to clear it despite calling the ward office. Serious hygiene issue near a tea shop." },

  // ---- G14 - blocked storm drain flooding, Sungam ------------------------
  { id: "C047", ward: "Ward 66", channel: "portal", gold: { dept: "sewerage", group: "G14", urgency: "P1" },
    text: "The storm water drain at Sungam is completely blocked with silt and plastic. Even a small rain floods the road knee deep and water enters the ground floor shops." },
  { id: "C048", ward: "Ward 66", channel: "whatsapp", gold: { dept: "sewerage", group: "G14", urgency: "P1" },
    text: "Sungam junction floods every time it rains because the rain water drain is choked. Yesterday water entered two houses. Please desilt the drain before the next spell." },
  { id: "C049", ward: "Ward 66", channel: "email", gold: { dept: "sewerage", group: "G14", urgency: "P1" },
    text: "The rain water carrier near Sungam has not been desilted this season and is fully blocked. Consequently the entire stretch gets submerged during rain and traffic comes to a standstill. Request urgent cleaning." },

  // ================= unique incidents, all eight desks ====================
  { id: "C050", ward: "Ward 11", channel: "portal", gold: { dept: "roads", group: null, urgency: "P2" },
    text: "A trench cut across Mettupalayam Road for a cable line three months ago was never properly closed. The refill has sunk and vehicles jolt over it." },
  { id: "C051", ward: "Ward 27", channel: "whatsapp", gold: { dept: "roads", group: null, urgency: "P3" },
    text: "The speed breaker near our school gate has no white paint left on it. Please repaint the markings so drivers can see it." },
  { id: "C052", ward: "Ward 58", channel: "email", gold: { dept: "roads", group: null, urgency: "P1" },
    text: "The approach road to the railway underbridge at Podanur has caved in on one side after the rain. A car wheel went into it last night. This needs barricading and repair immediately." },
  { id: "C053", ward: "Ward 19", channel: "phone", gold: { dept: "roads", group: null, urgency: "P2" },
    text: "Caller says the newly laid road at Sundarapuram already has cracks all over and loose gravel is causing skids." },
  { id: "C054", ward: "Ward 35", channel: "portal", gold: { dept: "roads", group: null, urgency: "P3" },
    text: "Request for laying a proper footpath on the school stretch of Tatabad 4th street. Currently children walk on the carriageway." },

  { id: "C055", ward: "Ward 09", channel: "whatsapp", gold: { dept: "lighting", group: null, urgency: "P1" },
    text: "The wire from the street light pole near our house is hanging down and sparking whenever it is windy. It is at hand height and children play right there." },
  { id: "C056", ward: "Ward 24", channel: "portal", gold: { dept: "lighting", group: null, urgency: "P2" },
    text: "The high mast light at Hopes College junction has been off for a fortnight. The whole crossing is dark and it is a busy junction at night." },
  { id: "C057", ward: "Ward 47", channel: "phone", gold: { dept: "lighting", group: null, urgency: "P3" },
    text: "Street lamp outside house number 14 keeps flickering on and off through the night. Not dark but annoying, resident asks for replacement when the crew is nearby." },
  { id: "C058", ward: "Ward 63", channel: "whatsapp", gold: { dept: "lighting", group: null, urgency: "P2" },
    text: "Street lights in our street are burning through the whole day also. Waste of current, nobody switches them off." },

  { id: "C059", ward: "Ward 30", channel: "portal", gold: { dept: "waste", group: null, urgency: "P2" },
    text: "Door to door garbage collection has not happened in our apartment block for five days. The bags are piling up in the stairwell." },
  { id: "C060", ward: "Ward 68", channel: "whatsapp", gold: { dept: "waste", group: null, urgency: "P1" },
    text: "Somebody is burning the garbage pile at the corner of our street every evening. The smoke comes into the houses and my father has asthma, he cannot breathe." },
  { id: "C061", ward: "Ward 12", channel: "email", gold: { dept: "waste", group: null, urgency: "P2" },
    text: "Construction debris from a nearby building has been dumped on the vacant corporation plot behind our lane. It has been there for weeks and more is being added." },
  { id: "C062", ward: "Ward 51", channel: "phone", gold: { dept: "waste", group: null, urgency: "P3" },
    text: "Resident asks for an additional dustbin at the park entrance because people leave waste on the ground there." },
  { id: "C063", ward: "Ward 05", channel: "whatsapp", gold: { dept: "waste", group: null, urgency: "P2" },
    text: "The conservancy worker mixes the segregated wet and dry waste back into the same lorry. Then why are we segregating at home." },

  { id: "C064", ward: "Ward 42", channel: "portal", gold: { dept: "water", group: null, urgency: "P1" },
    text: "A drinking water pipeline has burst near the Vellalore road junction and thousands of litres are running down the road since morning. Please shut the valve." },
  { id: "C065", ward: "Ward 17", channel: "whatsapp", gold: { dept: "water", group: null, urgency: "P2" },
    text: "Water pressure is so low in our street that it does not even reach the ground floor tap. We get water only for ten minutes." },
  { id: "C066", ward: "Ward 71", channel: "phone", gold: { dept: "water", group: null, urgency: "P2" },
    text: "The public tap at the end of the street has not been working for a month. Families who depend on it are carrying water from far." },
  { id: "C067", ward: "Ward 38", channel: "email", gold: { dept: "water", group: null, urgency: "P3" },
    text: "Request for a new water connection sanction for our newly constructed house. We have submitted the application but there is no response." },

  { id: "C068", ward: "Ward 26", channel: "whatsapp", gold: { dept: "sewerage", group: null, urgency: "P1" },
    text: "Drainage water is entering our house through the back wall whenever the line is full. There is faecal matter in the bathroom. My mother is elderly and this is a disease risk." },
  { id: "C069", ward: "Ward 59", channel: "portal", gold: { dept: "sewerage", group: null, urgency: "P2" },
    text: "The open drain along our lane has not been desilted for months. Sullage is standing still and the smell is very bad all day." },
  { id: "C070", ward: "Ward 08", channel: "phone", gold: { dept: "sewerage", group: null, urgency: "P2" },
    text: "Caller reports that the sewer connection of a new house has been given directly into the storm water drain instead of the UGD line." },
  { id: "C071", ward: "Ward 74", channel: "whatsapp", gold: { dept: "sewerage", group: null, urgency: "P1" },
    text: "The manhole at our street corner overflows every single morning at 6am when everyone uses water. Sewage spreads right in front of the anganwadi where small children come." },

  { id: "C072", ward: "Ward 22", channel: "portal", gold: { dept: "health", group: null, urgency: "P1" },
    text: "Stray dogs in a pack of about eight have bitten three people in our street this month including a school child. Please arrange catching." },
  { id: "C073", ward: "Ward 46", channel: "email", gold: { dept: "health", group: null, urgency: "P2" },
    text: "A meat shop next to our house washes waste directly into the open drain. Flies and stench all day. Request a hygiene inspection of the premises." },
  { id: "C074", ward: "Ward 13", channel: "whatsapp", gold: { dept: "health", group: null, urgency: "P2" },
    text: "No fogging has been done in our entire ward this season. Mosquitoes are terrible in the evening and fever cases are going up." },
  { id: "C075", ward: "Ward 65", channel: "phone", gold: { dept: "health", group: null, urgency: "P3" },
    text: "Resident requests that the public toilet near the market be cleaned more frequently, currently it is washed only once a day." },

  { id: "C076", ward: "Ward 31", channel: "portal", gold: { dept: "planning", group: null, urgency: "P2" },
    text: "A four storey building is coming up next to us with no approved plan displayed and no setback left on the side. Our compound wall is already cracking." },
  { id: "C077", ward: "Ward 54", channel: "whatsapp", gold: { dept: "planning", group: null, urgency: "P3" },
    text: "Illegal flex banners have been tied across the junction blocking the view of oncoming traffic. Please remove the unauthorised hoardings." },
  { id: "C078", ward: "Ward 18", channel: "email", gold: { dept: "planning", group: null, urgency: "P2" },
    text: "Street vendors have permanently occupied the road margin near the bus stop with fixed sheds, reducing the road width to one lane during peak hours." },
  { id: "C079", ward: "Ward 69", channel: "phone", gold: { dept: "planning", group: null, urgency: "P3" },
    text: "Caller complains that a commercial godown is operating in a residential zone with lorries loading at night." },

  { id: "C080", ward: "Ward 04", channel: "whatsapp", gold: { dept: "parks", group: null, urgency: "P1" },
    text: "A big branch of the rain tree in front of the school is cracked and hanging directly over the electric line. One more windy night and it will come down on the wires." },
  { id: "C081", ward: "Ward 37", channel: "portal", gold: { dept: "parks", group: null, urgency: "P2" },
    text: "The see saw and swing in the corporation park are rusted through and the seat has come loose. A child could get hurt. Please repair or remove them." },
  { id: "C082", ward: "Ward 60", channel: "email", gold: { dept: "parks", group: null, urgency: "P3" },
    text: "The park in our locality has not been maintained for months. Grass is waist high and the walking track is covered in weeds." },
  { id: "C083", ward: "Ward 49", channel: "whatsapp", gold: { dept: "parks", group: null, urgency: "P3" },
    text: "The avenue trees on our road have grown into the street lamps so the light does not fall on the road. Please trim the branches." },

  { id: "C084", ward: "Ward 29", channel: "portal", gold: { dept: "roads", group: null, urgency: "P1" },
    text: "There is no barricade or warning board around the road work being done near the school gate. The pit is open and unlit at night." },
  { id: "C085", ward: "Ward 43", channel: "whatsapp", gold: { dept: "water", group: null, urgency: "P1" },
    text: "White worms are visible in the water coming from our tap. We have stopped drinking it. Please check the line, the whole street is affected." },
  { id: "C086", ward: "Ward 56", channel: "email", gold: { dept: "lighting", group: null, urgency: "P2" },
    text: "The lights in the subway are all fused. It is completely dark inside even during the day and women avoid using it entirely." },
  { id: "C087", ward: "Ward 10", channel: "phone", gold: { dept: "waste", group: null, urgency: "P2" },
    text: "Garbage from the market is being dumped into the storm water drain by the shopkeepers every night after closing." },
  { id: "C088", ward: "Ward 64", channel: "whatsapp", gold: { dept: "health", group: null, urgency: "P1" },
    text: "There is stagnant sewage water in the empty plot beside the primary school and the children play right next to it. Three kids in that class already have fever." },
  { id: "C089", ward: "Ward 20", channel: "portal", gold: { dept: "sewerage", group: null, urgency: "P2" },
    text: "The drain slab in front of our gate is broken and the gap is wide enough for a leg to go in. It has been like this since the last desilting." },
  { id: "C090", ward: "Ward 73", channel: "email", gold: { dept: "planning", group: null, urgency: "P2" },
    text: "A building owner has covered the entire open drain in front of his property with a concrete ramp, so the drain cannot be cleaned at all now." },
  { id: "C091", ward: "Ward 06", channel: "whatsapp", gold: { dept: "parks", group: null, urgency: "P2" },
    text: "The compound wall of the park has collapsed on one side and cattle are getting in and grazing on the lawn." },
  { id: "C092", ward: "Ward 32", channel: "phone", gold: { dept: "roads", group: null, urgency: "P2" },
    text: "Caller reports that the road hump built by residents without permission is too high and vehicles scrape the bottom." },
  { id: "C093", ward: "Ward 45", channel: "portal", gold: { dept: "water", group: null, urgency: "P2" },
    text: "The overhead tank in our area is overflowing and running to waste for two hours every day because the operator does not close the valve on time." },

  // ============ deliberately ambiguous - a human cannot route these =========
  { id: "C094", ward: "Ward 41", channel: "whatsapp", gold: { dept: "unclear", group: null, urgency: "P3" },
    text: "please do the needful in our area, problem is going on since long time and nobody is listening. kindly take action immediately sir" },
  { id: "C095", ward: "Ward 28", channel: "phone", gold: { dept: "unclear", group: null, urgency: "P3" },
    text: "Caller was upset about the general condition of the ward and disconnected before giving details of the specific issue or the location." },
  { id: "C096", ward: "Ward 57", channel: "portal", gold: { dept: "unclear", group: null, urgency: "P3" },
    text: "Same issue as my previous complaint number 20481. Still not resolved. Requesting escalation to the commissioner." },
  { id: "C097", ward: "Ward 16", channel: "whatsapp", gold: { dept: "unclear", group: null, urgency: "P3" },
    text: "very bad situation here. everyone in the street is suffering. we pay our tax properly but no service. shame" },
  { id: "C098", ward: "Ward 70", channel: "email", gold: { dept: "unclear", group: null, urgency: "P3" },
    text: "There is a problem near the corner. It has been there for a while now and it is getting worse. Someone should come and see it." },
  { id: "C099", ward: "Ward 25", channel: "whatsapp", gold: { dept: "unclear", group: null, urgency: "P3" },
    text: "ward office la phone panna yaarum edukala. 3 times try pannachu. ivlo naala inum onnum aagala" },
  { id: "C100", ward: "Ward 62", channel: "portal", gold: { dept: "unclear", group: null, urgency: "P3" },
    text: "Water and road both are issues in this area, also the lights sometimes. Please look into everything when your team visits next." },
];

export const CORPUS_STATS = {
  total: CORPUS.length,
  incidents: new Set(CORPUS.map((c) => c.gold.group ?? c.id)).size,
  duplicated: CORPUS.filter((c) => c.gold.group !== null).length,
  ambiguous: CORPUS.filter((c) => c.gold.dept === "unclear").length,
};
