// desucrate-fractal-mod.js
/**
 * Modified Base game map script - Produces widely varied small continents.
 * @packageDocumentation
 */


/*          - Better Maps: Small Continents -
 *
 *          Most code in this file is by Firaxis.
 *  Any modified code should be marked as from Better Maps with a *BM*
 */

console.log("Generating using script desucrate-fractal-mod.js");
import { assignStartPositions, chooseStartSectors } from '/base-standard/maps/assign-starting-plots.js';
import { addMountains, addHills, buildRainfallMap, generateLakes } from '/base-standard/maps/elevation-terrain-generator.js';
// *BM* disable vanilla imports
//import { addFeatures, designateBiomes } from '/base-standard/maps/feature-biome-generator.js';
//import * as globals from '/base-standard/maps/map-globals.js';
import * as utilities from '/base-standard/maps/map-utilities.js';
import { addNaturalWonders } from '/base-standard/maps/natural-wonder-generator.js';
import { generateResources } from '/base-standard/maps/resource-generator.js';
import { addVolcanoes } from '/base-standard/maps/volcano-generator.js';
import { assignAdvancedStartRegions } from '/base-standard/maps/assign-advanced-start-region.js';
import { generateDiscoveries } from '/base-standard/maps/discovery-generator.js';
import { generateSnow, dumpPermanentSnow } from '/base-standard/maps/snow-generator.js';
import { dumpStartSectors, dumpContinents, dumpTerrain, dumpElevation, dumpRainfall, dumpBiomes, dumpFeatures, dumpResources, dumpNoisePredicate } from '/base-standard/maps/map-debug-helpers.js';

// *BM* imports
import * as betterMaps from '/better-maps-small-continents/maps/desucrate-map-utilities.js';
import { addFeatures, designateBiomes } from '/better-maps-small-continents/maps/desucrate-feature-biome-generator.js';
import * as globals from '/better-maps-small-continents/maps/desucrate-map-globals.js';
function requestMapData(initParams) { 
    // *BM* add strings to log var names 
    console.log("initParams.width = " + initParams.width);
    console.log("initParams.height = " + initParams.height);
    console.log("initParams.topLatitude = " + initParams.topLatitude);
    console.log("initParams.bottomLatitude = " + initParams.bottomLatitude);
    console.log("initParams.wrapX = " + initParams.wrapX);
    console.log("initParams.wrapY = " + initParams.wrapY);
    console.log("initParams.mapSize = " + initParams.mapSize);
    engine.call("SetMapInitData", initParams);
}
function generateMap() {
    let naturalWonderEvent = false;
    const liveEventDBRow = GameInfo.GlobalParameters.lookup("REGISTERED_RACE_TO_WONDERS_EVENT");
    if (liveEventDBRow && liveEventDBRow.Value != "0") {
        naturalWonderEvent = true;
    }
    console.log("Generating a map!");
    console.log(`Age - ${GameInfo.Ages.lookup(Game.age).AgeType}`);
    let iWidth = GameplayMap.getGridWidth();
    let iHeight = GameplayMap.getGridHeight();
    let uiMapSize = GameplayMap.getMapSize();
    let startPositions = [];
    let mapInfo = GameInfo.Maps.lookup(uiMapSize);

    // *BM*
    let standardSize = (84 * 54);
    let fMapScale = Math.max(((iWidth * iHeight) / standardSize) * 0.85, 1);
    console.log("fMapScale = " + fMapScale);
    console.log("Name = " + mapInfo.Name);
    console.log("Type = " + mapInfo.MapSizeType);
    //=======================================================================================================
    let fWaterPercentFactor = 1.45; //g_waterPercent gets multiplied by this, 1.45 by default on continents++
    //if (mapInfo.MapSizeType == "MAPSIZE_MASSIVE") {
    //  fWaterPercentFactor = 1.35;
    //}
    if (fMapScale > 1.25) {
        fMapScale = fMapScale - ((fMapScale - 1.25) * 0.4);
    }
    console.log("Adjusted fMapScale = " + fMapScale);
    // end *BM*

    if (mapInfo == null)
        return;
    let iNumNaturalWonders = mapInfo.NumNaturalWonders;
    let iTilesPerLake = mapInfo.LakeGenerationFrequency;
    let iNumPlayers1 = mapInfo.PlayersLandmass1;
    let iNumPlayers2 = mapInfo.PlayersLandmass2;

    // *BM* randomise continent boundary location
    let centerOceanSizeAdjustment = TerrainBuilder.getRandomNumber(2, "Central Ocean Size Adjustment");
    console.log("Central Ocean Size Adjustment = " + centerOceanSizeAdjustment);

    let SeamOffsetSizeAdjustment = TerrainBuilder.getRandomNumber(2, "Map Edge Ocean Size Adjustment");
    console.log("Map Edge Ocean Size Adjustment = " + SeamOffsetSizeAdjustment);

    let centerOceanOffset = TerrainBuilder.getRandomNumber(globals.bm_CentralOceanOffsetMax, "Central Ocean Offset");
    centerOceanOffset -= globals.bm_CentralOceanOffsetMax / 2;
    console.log("Central Ocean Offset = " + centerOceanOffset);

    let westContinentPolarOffset = TerrainBuilder.getRandomNumber(globals.bm_PolarWaterOffsetMax, "West Polar Offset")
    westContinentPolarOffset -= globals.bm_PolarWaterOffsetMax / 2;
    let eastContinentPolarOffset = TerrainBuilder.getRandomNumber(globals.bm_PolarWaterOffsetMax, "East Polar Offset")
    eastContinentPolarOffset -= globals.bm_PolarWaterOffsetMax / 2;


    // Establish continent boundaries
    let westContinent = {
        west: (globals.g_AvoidSeamOffset + SeamOffsetSizeAdjustment),// + globals.g_IslandWidth,
        east: (iWidth / 2) - (centerOceanOffset + globals.g_AvoidSeamOffset + centerOceanSizeAdjustment),
        south: globals.g_PolarWaterRows,
        north: iHeight - (globals.g_PolarWaterRows + 1),
        continent: 0
    };
    let eastContinent = {
        west: westContinent.east + (2 * (globals.g_AvoidSeamOffset + centerOceanSizeAdjustment)),// + globals.g_IslandWidth,
        east: iWidth - (globals.g_AvoidSeamOffset + SeamOffsetSizeAdjustment),
        south: globals.g_PolarWaterRows,
        north: iHeight - (globals.g_PolarWaterRows + 1),
        continent: 0
    };
    let westContinent2 = {
        west: globals.g_AvoidSeamOffset,
        east: globals.g_AvoidSeamOffset,// + globals.g_IslandWidth,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0
    };
    let eastContinent2 = {
        west: (iWidth / 2) + globals.g_AvoidSeamOffset,
        east: (iWidth / 2) + globals.g_AvoidSeamOffset,// + globals.g_IslandWidth,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0
    };

    let startSectors = [];
    let iStartSectorRows = 0;
    let iStartSectorCols = 0;
    let startPosition = Configuration.getMapValue("StartPosition");

    if (startPosition == null) {
        startPosition = Database.makeHash('START_POSITION_STANDARD');
    }
    startPosition = Number(BigInt.asIntN(32, BigInt(startPosition))); // Convert to signed int32.
    let startPositionHash = Database.makeHash("START_POSITION_BALANCED");
    let bIsBalanced = (startPosition == startPositionHash);

    // *BM* vanilla functions, uses Start Position setting to generate a Balanced or Standard map
    // *BM* Balanced Map:

    if (bIsBalanced) {
        console.log("Balanced Map");
        let iRandom = TerrainBuilder.getRandomNumber(2, "East or West");
        console.log("Random Hemisphere: " + iRandom);
        if (iRandom == 1) {
            let iNum1 = iNumPlayers1;
            let iNum2 = iNumPlayers2;
            iNumPlayers1 = iNum2;
            iNumPlayers2 = iNum1;
        }
        let bHumanNearEquator = utilities.needHumanNearEquator();
        iStartSectorRows = mapInfo.StartSectorRows;
        iStartSectorCols = mapInfo.StartSectorCols;
        startSectors = chooseStartSectors(iNumPlayers1, iNumPlayers2, iStartSectorRows, iStartSectorCols, bHumanNearEquator);
        dumpStartSectors(startSectors);
        // *BM* use BM createLandmasses function over vanilla
        betterMaps.createLandmasses(iWidth, iHeight, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors, fMapScale, fWaterPercentFactor);
        utilities.addPlotTags(iHeight, iWidth, eastContinent.west);
        // *BM* use Gedemon's Continents++ createCloseIslands function to generate varied islands
        //betterMaps.createCloseIslands(iWidth, iHeight, westContinent, eastContinent, 4);
        // *BM* disable standard island functions?
        //utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 4);
        //utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
        //utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
    }

    // *BM* Standard Map:

    else {
        console.log("Standard Map");
        let iFractalGrain = 3;
        let iWaterPercent = globals.g_WaterPercent * globals.g_Cutoff;
        let iLargestContinentPercent = 12;
        // *BM* use BM createOrganicLandmasses function over vanilla
        betterMaps.createOrganicLandmasses(iWidth, iHeight, westContinent, eastContinent, iFractalGrain, iWaterPercent, iLargestContinentPercent, fWaterPercentFactor);
        utilities.addPlotTags(iHeight, iWidth, eastContinent.west);
        // Is biggest area in west or east?
        let iAreaID = AreaBuilder.findBiggestArea(false);
        let kBoundaries = AreaBuilder.getAreaBoundary(iAreaID);
        console.log("BIGGEST AREA");
        console.log("  West: " + kBoundaries.west);
        console.log("  East: " + kBoundaries.east);
        console.log("  South: " + kBoundaries.south);
        console.log("  North: " + kBoundaries.north);
        if (kBoundaries.west > (iWidth / 2)) {
            let iNum1 = iNumPlayers1;
            let iNum2 = iNumPlayers2;
            iNumPlayers1 = iNum2;
            iNumPlayers2 = iNum1;
        }
        // *BM* use Gedemon's Continents++ createCloseIslands function to generate varied islands
        //betterMaps.createCloseIslands(iWidth, iHeight, westContinent, eastContinent, 4);
        // *BM* disable standard island functions
        //utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 4);
        //utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
        //utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
    }

    TerrainBuilder.validateAndFixTerrain();
    expandCoastsPlus(westContinent.west, westContinent.east, iHeight);
    expandCoastsPlus(eastContinent.west, eastContinent.east, iHeight);
    expandCoastsPlus(0, westContinent.west - globals.g_OceanWaterColumns, iHeight);
    expandCoastsPlus(westContinent.east + globals.g_OceanWaterColumns, eastContinent.west - globals.g_OceanWaterColumns, iHeight);
    expandCoastsPlus(eastContinent.east + globals.g_OceanWaterColumns, 0, iHeight);
    AreaBuilder.recalculateAreas();
    TerrainBuilder.stampContinents();
    addMountains(iWidth, iHeight);
    addVolcanoes(iWidth, iHeight);
    generateLakes(iWidth, iHeight, iTilesPerLake);
    AreaBuilder.recalculateAreas();
    TerrainBuilder.buildElevation();
    addHills(iWidth, iHeight);
    buildRainfallMap(iWidth, iHeight);
    TerrainBuilder.modelRivers(5, 15, globals.g_NavigableRiverTerrain);
    TerrainBuilder.validateAndFixTerrain();
    TerrainBuilder.defineNamedRivers();
    designateBiomes(iWidth, iHeight);
    addNaturalWonders(iWidth, iHeight, iNumNaturalWonders);
    TerrainBuilder.addFloodplains(4, 10);
    addFeatures(iWidth, iHeight);
    TerrainBuilder.validateAndFixTerrain();
    utilities.adjustOceanPlotTags(iNumPlayers1 > iNumPlayers2);
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = GameplayMap.getTerrainType(iX, iY);
            if (terrain == globals.g_CoastTerrain) {
                TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_WATER);
                if (iNumPlayers1 > iNumPlayers2) {
                    if (iX < westContinent.west - 2 || iX > westContinent.east + 2) {
                        //console.log("Islands on the Coast: " + iX + ", " + iY)
                        TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_EAST_WATER);
                    }
                    else {
                        //console.log("Main Coast: " + iX + ", " + iY)
                        TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WEST_WATER);
                    }
                }
                else {
                    if (iX > eastContinent.east + 2 || iX < eastContinent.west - 2) {
                        //console.log("Islands on the Coast2: " + iX + ", " + iY)
                        TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WEST_WATER);
                    }
                    else {
                        //console.log("Main Coast2: " + iX + ", " + iY)
                        TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_EAST_WATER);
                    }
                }
            }
        }
    }
    AreaBuilder.recalculateAreas();
    TerrainBuilder.storeWaterData();
    generateSnow(iWidth, iHeight);
    dumpContinents(iWidth, iHeight);
    dumpTerrain(iWidth, iHeight);
    dumpElevation(iWidth, iHeight);
    dumpRainfall(iWidth, iHeight);
    dumpBiomes(iWidth, iHeight);
    dumpFeatures(iWidth, iHeight);
    dumpPermanentSnow(iWidth, iHeight);
    generateResources(iWidth, iHeight, westContinent, eastContinent, iNumPlayers1, iNumPlayers2);
    startPositions = assignStartPositions(iNumPlayers1, iNumPlayers2, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors);
    generateDiscoveries(iWidth, iHeight, startPositions);
    dumpResources(iWidth, iHeight);
    FertilityBuilder.recalculate(); // Must be after features are added.
    let seed = GameplayMap.getRandomSeed(); // can use any seed you want for different noises
    // *BM* log seed
    console.log("Seed: " + seed);
    let avgDistanceBetweenPoints = 3;
    let normalizedRangeSmoothing = 2;
    let poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);
    let poissonPred = (val) => {
        return val >= 1 ? "*" : " ";
    };
    dumpNoisePredicate(iWidth, iHeight, poisson, poissonPred);
    assignAdvancedStartRegions();
}
// Register listeners.
engine.on('RequestMapInitData', requestMapData);
engine.on('GenerateMap', generateMap);
console.log("Loaded desucrate-fractal-mod.js");
// *BM* vanilla generateLandmasses function is here, BM removes it and uses the modified version from
// /better-maps-small-continents/maps/desucrate-map-utilities.js
export function expandCoastsPlus(iWest, iEast, iHeight) {
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = iWest; iX < iEast; iX++) {
            let terrain = GameplayMap.getTerrainType(iX, iY);
            if (terrain == globals.g_OceanTerrain) {
                if (GameplayMap.isAdjacentToShallowWater(iX, iY) && TerrainBuilder.getRandomNumber(2, "Shallow Water Scater Scatter") == 0) {
                    TerrainBuilder.setTerrainType(iX, iY, globals.g_CoastTerrain);
                }
            }
        }
    }
}

//# sourceMappingURL=file:///base-standard/maps/fractal.js.map
