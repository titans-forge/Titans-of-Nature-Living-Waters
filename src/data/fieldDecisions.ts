/** Investigation choices use only the game's existing, authored stations and kits.
 * Seasonal variants follow the existing venue conditions and encounter calendar;
 * none introduces a new real-world access rule, measurement, or guaranteed catch. */
export interface FieldDecisionPlan {
  id: string;
  title: string;
  question: string;
  evidence: string;
  tradeoff: string;
  gearId: string;
  habitatId: string;
  seasonal?: Record<string, Partial<Omit<FieldDecisionPlan, 'id' | 'seasonal'>>>;
}

export interface FieldDecisionDefinition {
  question: string;
  plans: [FieldDecisionPlan, FieldDecisionPlan];
}

export const fieldDecisions: Record<string, FieldDecisionDefinition> = {
  amazon: {
    question: 'Where should we look for fish using the connection between forest and river?',
    plans: [
      { id: 'forest', title: 'Work the forest opening', question: 'What uses the shaded root edge?', evidence: 'A fish record here links identity and handling to forest cover.', tradeoff: 'Wood demands a controlled placement; this station does not describe the open channel.', gearId: 'surface', habitatId: 'roots' },
      { id: 'current', title: 'Follow the open seam', question: 'What uses the moving-water corridor?', evidence: 'A channel record adds a different habitat and surface-feeding encounter to the journey.', tradeoff: 'Open water gives room to work, but skips fish dispersed inside the forest.', gearId: 'balanced', habitatId: 'channel' },
    ],
  },
  okavango: {
    question: 'Does this visit tell us more at the papyrus edge or at the channel connecting the floodplain?',
    plans: [
      { id: 'papyrus', title: 'Investigate the papyrus opening', question: 'What patrols shelter beside open water?', evidence: 'The reed-edge kit works above stems at a safe opening, away from the unsafe bank.', tradeoff: 'Cover creates snag risk and requires more control than the open channel.', gearId: 'reed', habitatId: 'reeds' },
      { id: 'connection', title: 'Survey the channel mouth', question: 'What uses the floodplain connection?', evidence: 'A channel record places fish use in the water joining permanent and temporary habitat.', tradeoff: 'Searching open water misses the sheltered reed edge.', gearId: 'channel', habitatId: 'channel', seasonal: {
        'receding-channels': { gearId: 'light', evidence: 'The floodplain kit makes a channel-mouth record as connections shrink.', tradeoff: 'Light tackle needs measured control; one fish cannot establish whether every return route is open.' },
      } },
    ],
  },
  'tonle-sap': {
    question: 'Which part of the floodplain connection should our next record describe?',
    plans: [
      { id: 'margin', title: 'Investigate flooded forest', question: 'What uses newly available cover?', evidence: 'The forest kit links a resident-fish encounter to submerged trunks.', tradeoff: 'Branches constrain the fight; this does not trace a migration route.', gearId: 'forest', habitatId: 'forest', seasonal: {
        'drainage-migration': { title: 'Investigate the rice margin', question: 'What remains at the draining margin?', habitatId: 'lotus', evidence: 'The shallow artificial works above margin plants for a resident-fish record.', tradeoff: 'A margin record describes local use, not an unobstructed route back to the Mekong.' },
      } },
      { id: 'flow', title: 'Follow the connected channel', question: 'What moves through open water?', evidence: 'The migration kit pairs a small-fish encounter with the channel station.', tradeoff: 'Lighter line gives less control near trunks; a single record cannot map the whole migration.', gearId: 'migration', habitatId: 'channel', seasonal: {
        'high-lake': { gearId: 'bait', title: 'Investigate channel use at high water', question: 'What uses the channel while fish disperse?', evidence: 'The lotus-margin kit makes a small resident-fish record in the channel.', tradeoff: 'Bait has non-target risk. This is a local habitat record, not a migration count.' },
      } },
    ],
  },
  'florida-bay': {
    question: 'Which habitat use should we connect to this tide and salinity?',
    plans: [
      { id: 'shelter', title: 'Work the mangrove boundary', question: 'What uses roots beside the moving tide?', evidence: 'The mangrove kit links a fish record to nursery cover and this season.', tradeoff: 'A wide or low presentation enters roots; it does not sample the grass flat.', gearId: 'roots', habitatId: 'mangroves', seasonal: {
        'dry-salinity': { title: 'Work the creek boundary', question: 'What uses the remaining tidal seam?', gearId: 'flat', habitatId: 'creek', evidence: 'The light suspending lure makes a fish record where creek and bay meet.', tradeoff: 'Light line gives less control beside oyster shell; this station does not describe the whole bay.' },
      } },
      { id: 'exchange', title: 'Investigate the grass flat', question: 'What crosses intact seagrass?', evidence: 'A suspending presentation above the blades links a fish record to flat habitat.', tradeoff: 'Shallow placement matters; dragging the lure through grass damages the habitat being studied.', gearId: 'flat', habitatId: 'seagrass', seasonal: {
        'wet-freshening': { title: 'Investigate creek exchange', question: 'What uses the freshening creek flow?', gearId: 'creek', habitatId: 'creek', evidence: 'The tide-card kit makes a moving-water record outside the nursery roots.', tradeoff: 'Drifting loose grass can foul the lure; this station misses fish staying within root cover.' },
      } },
    ],
  },
  'alaska-kelp': {
    question: 'Should our record describe sheltered kelp habitat or the deeper channel?',
    plans: [
      { id: 'canopy', title: 'Investigate the protected canopy', question: 'What uses the kelp opening?', evidence: 'A shallow lure works above living stipes for a kelp-edge fish record.', tradeoff: 'A low retrieve wraps kelp. This plan avoids targeting the unwanted rockfish concentration.', gearId: 'kelp', habitatId: 'kelp' },
      { id: 'channel', title: 'Investigate channel depth', question: 'What uses bottom water in the current corridor?', evidence: 'The bottom kit records a deeper channel encounter with the actual station and gear.', tradeoff: 'Heavy tackle can snag, and a channel record misses the sheltered canopy.', gearId: 'bottom', habitatId: 'channel' },
    ],
  },
  baikal: {
    question: 'Do we need an in-place habitat image or a record from the river approach?',
    plans: [
      { id: 'shelf', title: 'Observe attached shelf life', question: 'What is visible on the rocky littoral shelf?', evidence: 'The camera records attached organisms in place without bringing them through a pressure change.', tradeoff: 'The view covers a small patch; dragging the sled can damage sponges.', gearId: 'camera', habitatId: 'shelf' },
      { id: 'migration', title: 'Join the authorized river-approach survey', question: 'What uses the Selenga migration approach?', evidence: 'The research kit creates a supervised fish record tied to the delta station.', tradeoff: 'This is a fictional authorized survey, not permission for recreational sturgeon capture.', gearId: 'survey', habitatId: 'delta', seasonal: {
        'autumn-tributaries': { title: 'Investigate tributary movement', gearId: 'drift', evidence: 'The cold-water drift kit makes a fish record at the river-connected approach.', tradeoff: 'The light kit cannot safely control a sturgeon; one record does not establish a seasonal migration total.' },
      } },
    ],
  },
  'lake-holiday': {
    question: 'Should the next record describe shoreline structure or the reservoir depth transition?',
    plans: [
      { id: 'cover', title: 'Work the shaded cove', question: 'What uses intact woody cover?', evidence: 'The weedless lure makes a fish record beside branches without sampling the basin bottom.', tradeoff: 'A hard placement leaves tackle in wood; shoreline use does not describe deeper water.', gearId: 'cover', habitatId: 'cove' },
      { id: 'depth', title: 'Investigate the basin edge', question: 'What uses the open depth transition?', evidence: 'The float kit makes a fish record away from dense shoreline branches.', tradeoff: 'Small tackle gives less control. A record at this depth says nothing about oxygen unless it is measured.', gearId: 'float', habitatId: 'basin', seasonal: {
        'summer-stratification': { gearId: 'bottom', evidence: 'The bottom kit changes the sampled depth and provides the depth-and-temperature tools.', tradeoff: 'Deeper is not automatically better: this game record does not measure oxygen, and old timber can snag the rig.' },
      } },
    ],
  },
  nile: {
    question: 'Which record helps us read fish habitat within the regulated river?',
    plans: [
      { id: 'margin', title: 'Investigate the reed margin', question: 'What uses slower water beside cover?', evidence: 'The light float kit makes a margin-fish record while keeping the hook above plants.', tradeoff: 'The kit cannot control a large main-channel predator. Carrying an oxygen meter is not a saved oxygen measurement.', gearId: 'light', habitatId: 'reeds' },
      { id: 'channel', title: 'Work the main-current seam', question: 'What uses the managed flow corridor?', evidence: 'The main-channel kit makes a strong-fish record outside the planted margin.', tradeoff: 'Position must stay clear of working boats; the deep presentation has non-target risk.', gearId: 'channel', habitatId: 'channel', seasonal: {
        'warm-margin': { title: 'Investigate the canal connection', question: 'What uses water entering from cultivated land?', gearId: 'bottom', habitatId: 'canal', evidence: 'The bottom kit records a canal-mouth encounter with its different habitat context.', tradeoff: 'Bottom line can catch discarded irrigation gear; a fish encounter does not establish the water quality.' },
      } },
    ],
  },
  euphrates: {
    question: 'Does visible water support the reed margin, or should we investigate the connecting flow?',
    plans: [
      { id: 'reeds', title: 'Investigate the restored marsh', question: 'What uses the open reed pocket?', evidence: 'The survey float makes a marsh-fish record beside intact vegetated cover.', tradeoff: 'Carrying a conductivity meter is not a saved salinity reading. One record cannot demonstrate marsh recovery.', gearId: 'float', habitatId: 'marsh' },
      { id: 'flow', title: 'Investigate the distributary seam', question: 'What uses the moving connection?', evidence: 'A shallow-running artificial makes a river-fish record outside dense reeds.', tradeoff: 'A fast retrieve can enter reed islands; this does not describe water returning from fields.', gearId: 'drift', habitatId: 'channel', seasonal: {
        'summer-salinity': { title: 'Investigate the irrigation return', question: 'What uses the low-water canal mouth?', gearId: 'bottom', habitatId: 'canal', evidence: 'The circle rig changes the encounter and habitat recorded to the canal mouth.', tradeoff: 'Bait has non-target risk; a tolerant fish is not proof that the returned water supports all marsh life.' },
      } },
    ],
  },
  ganges: {
    question: 'Do we need a connected-margin fish record or a quiet listening station?',
    plans: [
      { id: 'nursery', title: 'Investigate the backwater', question: 'What uses the shallow connection?', evidence: 'The nursery float works above plants for a margin-fish record.', tradeoff: 'It cannot control a large current fish. A local record does not show that every nursery remains connected.', gearId: 'float', habitatId: 'backwater' },
      { id: 'listen', title: 'Listen along the main seam', question: 'What wildlife signal reaches the receiver?', evidence: 'The passive hydrophone gathers a dolphin observation without hooks, bait or pursuit.', tradeoff: 'Noise and current can mask the signal; a detection is not a count or an exact route.', gearId: 'acoustic', habitatId: 'channel' },
    ],
  },
  danube: {
    question: 'Should we investigate current habitat or listen for use of the migration corridor?',
    plans: [
      { id: 'gravel', title: 'Investigate the gravel seam', question: 'What uses moving bottom habitat?', evidence: 'The drift rig makes a native-fish record tied to the gorge gravel station.', tradeoff: 'Excess weight lodges in working gear; one current-seam record cannot establish passage through the barrier.', gearId: 'gravel-drift', habitatId: 'gravel' },
      { id: 'passage', title: 'Listen below the barrier', question: 'Which tagged signal approaches the corridor?', evidence: 'Telemetry records a sturgeon signal without capture or pursuit.', tradeoff: 'Wake and noise interfere. Detection near the barrier does not prove successful upstream passage.', gearId: 'telemetry', habitatId: 'navigation', seasonal: {
        'spring-floodplain': { title: 'Listen at the gravel approach', question: 'Which signal uses the connected gorge reach?', habitatId: 'gravel', evidence: 'The receiver changes the method from capture to a tagged-fish signal at the gravel station.', tradeoff: 'One signal cannot establish a whole migration route or the success of floodplain restoration.' },
      } },
    ],
  },
  'great-barrier-reef': {
    question: 'Should we investigate reef structure or follow life using the lagoon connection?',
    plans: [
      { id: 'reef', title: 'Work beside the bommie', question: 'What patrols the coral-sand boundary?', evidence: 'The coral-edge kit records a reef-fish encounter while the boat remains over sand.', tradeoff: 'Low placement or a prolonged fight puts line into living coral; open-looking water does not establish real access.', gearId: 'bommie', habitatId: 'bommie' },
      { id: 'connection', title: 'Observe the seagrass meadow', question: 'What wildlife uses the feeding habitat?', evidence: 'The pole camera makes an in-place turtle observation without bait or pursuit.', tradeoff: 'Glare can hide animals. Keep the route clear; one sighting is not a meadow-wide population count.', gearId: 'survey', habitatId: 'seagrass', seasonal: {
        'pelagic-passage': { title: 'Follow blue-water passage', question: 'What uses the outer current edge?', gearId: 'pelagic', habitatId: 'channel', evidence: 'The trolling kit switches to an open-water predator record beyond the reef structure.', tradeoff: 'Fast fish need measured drag. This angling record does not describe turtle use of the meadow.' },
      } },
    ],
  },
  'seto-inland-sea': {
    question: 'Which station helps us read a productive coast that people restore and work?',
    plans: [
      { id: 'habitat', title: 'Observe the restored meadow', question: 'What is visible among the eelgrass shoots?', evidence: 'The camera and quadrat make a nursery-habitat record without capture.', tradeoff: 'A small camera patch cannot demonstrate whole-bay restoration, and prop wash disturbs the subject.', gearId: 'survey', habitatId: 'eelgrass', seasonal: {
        'summer-oxygen': { title: 'Work above the meadow edge', question: 'What uses the warm meadow boundary?', gearId: 'eelgrass', evidence: 'The shallow artificial changes the record to a fish using the sand-meadow edge.', tradeoff: 'A fish record does not measure oxygen; retrieving through blades uproots the habitat.' },
        'autumn-seabream': { title: 'Investigate the working breakwater', question: 'What uses the engineered coast?', gearId: 'eelgrass', habitatId: 'harbor', evidence: 'The shallow artificial makes a fish record beside submerged stone.', tradeoff: 'Stay outside the working berth; harbor fish do not establish restored-meadow condition.' },
      } },
      { id: 'exchange', title: 'Work the island seam', question: 'What uses food carried by tidal exchange?', evidence: 'The controlled vertical lure makes a seabream record beside rock and sand.', tradeoff: 'Excess weight lodges in rock, and drifting into a working lane conflicts with traffic.', gearId: 'tai-rubber', habitatId: 'strait', seasonal: {
        'summer-oxygen': { title: 'Investigate the working breakwater', question: 'What uses the harbor stone edge?', gearId: 'eelgrass', habitatId: 'harbor', evidence: 'The shallow artificial makes a different habitat record away from the meadow.', tradeoff: 'A harbor fish does not establish water quality; boat activity and moorings constrain placement.' },
      } },
    ],
  },
  'yellow-river-delta': {
    question: 'Should we sample the connected nursery water or investigate fish using the estuary edge?',
    plans: [
      { id: 'nursery', title: 'Sample the reed-channel nursery', question: 'What biological trace is in this water?', evidence: 'A sterile eDNA sample records nursery evidence without netting juvenile fish.', tradeoff: 'Equipment contamination can create a false record; detection is not an animal count.', gearId: 'survey', habitatId: 'reed-channel', seasonal: {
        'autumn-migration': { title: 'Investigate the brackish bottom', question: 'What uses the marine-influenced depth band?', gearId: 'channel-jig', habitatId: 'mudflat', evidence: 'The jig makes a bottom-fish record at the outer mudflat edge.', tradeoff: 'This is an angling record, not an eDNA sample or salinity measurement. Excess weight buries in soft sediment.' },
      } },
      { id: 'edge', title: 'Work the freshwater edge', question: 'What follows prey beside the reeds?', evidence: 'The shallow lure makes a fish record beside the replenished channel.', tradeoff: 'A fixed salinity assumption can miss fish; a single catch does not measure ecological-flow success.', gearId: 'reed-lure', habitatId: 'reed-channel', seasonal: {
        'autumn-migration': { title: 'Work the outer mudflat edge', question: 'What uses the open marine boundary?', habitatId: 'mudflat', evidence: 'The shallow lure changes the station and fish record to the outer estuary.', tradeoff: 'Stay outside the bird shallows; this record alone cannot map the delta salinity gradient.' },
      } },
    ],
  },
  galapagos: {
    question: 'Should we observe the sea-shore boundary or follow the water mass through the channel?',
    plans: [
      { id: 'shore', title: 'Observe the lava-shore boundary', question: 'What crosses between water and lava?', evidence: 'The pole camera records shore wildlife in place without landing or approaching.', tradeoff: 'Swell and a low angle hide movement; this station does not describe channel-wide productivity.', gearId: 'shore-camera', habitatId: 'lava-shore' },
      { id: 'current', title: 'Observe a logged channel drift', question: 'What wildlife uses this moving water?', evidence: 'The drift survey links a wildlife observation to the channel station and season.', tradeoff: 'A moving water mass is not a fixed map point. One observation cannot establish food supply or population change.', gearId: 'drift-survey', habitatId: 'upwelling-channel' },
    ],
  },
};
