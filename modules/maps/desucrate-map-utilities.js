import * as globals from '/better-maps-small-continents/maps/desucrate-map-globals.js';
import * as utilities from '/base-standard/maps/map-utilities.js';

export function createLandmasses(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, fMapScale, fWaterPercentFactor) { 
    FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, 3 /*iFractalGrain - continents use 2, fractal uses 3. seems to affect noise resolution, making < 3 blobby and > 3 like a spiderweb.*/, 0);
    let iWaterHeight = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, globals.g_WaterPercent * fWaterPercentFactor);
    //=========================================================================================================================================================
    console.log("iWaterHeight = " + iWaterHeight);
    console.log("continent2.west = " + continent2.west);
    let iBuffer = Math.floor(iHeight / 13.5); //continents scripts use 18.0, fractal uses 13.5
    console.log("iBuffer = " + iBuffer);
    let iBuffer2 = Math.floor(iWidth / 21.0); //continents scripts use 28.0, fractal uses 21.0
    console.log("iBuffer2 = " + iBuffer2);
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = globals.g_FlatTerrain;
            let iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
            let iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");

            // *BM*
            //console.log("iPlotHeight at ("+iX+","+iY+")");
            let iPlotHeight = getHeightAdjustingForStartSector(iX, iY, iWaterHeight, globals.g_FractalWeight, 0.2 /* *BM* modify CenterWeight, vanilla is 0.0*/, globals.g_StartSectorWeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, fMapScale);
            //console.log(" - Adjusted For Start Sector iPlotHeight = " + iPlotHeight);
            // if between the continents
            if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 ||
                (iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2)) {
                iPlotHeight = Math.floor(iPlotHeight * 0.5);
                //console.log("   - Adjusted between continents iPlotHeight = " + iPlotHeight);
            }
            //console.log(" - Final iPlotHeight = " + iPlotHeight + "/" + iWaterHeight + " * " +  globals.g_Cutoff);
            // end *BM*
            //  Must be water if at the poles
            if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
                terrain = globals.g_OceanTerrain;
            }
            // Of if between the continents
            /*else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 ||

                (iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2)) {
                terrain = globals.g_OceanTerrain;
            }*/
            else {
                // Get the value from the fractal
                // *BM* i don't remember why commenting this out makes it better. probably duping the process if it's on
                //let iPlotHeight = getHeightAdjustingForStartSector(iX, iY, iWaterHeight, globals.g_FractalWeight, 0.0 /*CenterWeight*/, globals.g_StartSectorWeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, fMapScale);
                // Finally see whether or not this stays as Land or has too low a score and drops back to water
                if (iPlotHeight < iWaterHeight * (globals.g_FractalWeight + globals.g_StartSectorWeight)) {
                    terrain = globals.g_OceanTerrain;
                }
            }
            TerrainBuilder.setTerrainType(iX, iY, terrain);
        }
    }
}

export function createCloseIslands(iWidth, iHeight, continent1, continent2, iSize) {
    FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, iSize, 0);
    let iwater_percent = 50 /*Special Water Percent for Archipelago */ + iSize * 7;
    let iWaterHeight = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, iwater_percent);
    let iBuffer = Math.floor(iWidth / 24.0);
    let terrain = globals.g_FlatTerrain;
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
            if (iY >= continent1.south + iRandom &&
                iY <= continent1.north - iRandom &&
                (iX >= continent1.west && iX <= continent1.east ||
                    iX >= continent2.west && iX <= continent2.east)) {
                let iPlotHeight = FractalBuilder.getHeight(globals.g_LandmassFractal, iX, iY);
                if (iPlotHeight > iWaterHeight) {
                    TerrainBuilder.setTerrainType(iX, iY, terrain);
                    utilities.addLandmassPlotTags(iX, iY, continent2.west);
                }
            }
        }
    }
}

function getHeightAdjustingForStartSector(iX, iY, iWaterHeight, iFractalWeight, iCenterWeight, iStartSectorWeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors) {
    // Get the value from the fractal
    let iPlotHeight = FractalBuilder.getHeight(globals.g_LandmassFractal, iX, iY);
    iPlotHeight *= iFractalWeight;
    //console.log(" initial iPlotHeight = " + iPlotHeight);
    //*
    // Adjust based on distance from center of the continent
    let iDistanceFromCenter = utilities.getDistanceFromContinentCenter(iX, iY, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west, continent2.east);
    let iMaxDistanceFromCenter = utilities.getMaxDistanceFromContinentCenter(iX, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west, continent2.east);
    let iPercentFromCenter = Math.min(100 * iDistanceFromCenter / iMaxDistanceFromCenter, 100);
    iPlotHeight += iCenterWeight * Math.pow((iWaterHeight * (100 - iPercentFromCenter) / 100), globals.g_CenterExponent);
    //console.log(" Adjusted on distance from center of the continent : iPlotHeight = " + iPlotHeight + " / iPercentFromCenter =" + iPercentFromCenter + " / iDistanceFromCenter = " + iDistanceFromCenter);
    /*
    // Adjust based on whether or not the plot is near a start location (unless very far from center)
    if (iPercentFromCenter < globals.g_IgnoreStartSectorPctFromCtr) {
        let iSector = getSector(iX, iY, iStartSectorRows, iStartSectorCols, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west);
        if (startSectors[iSector]) {
            // Start sector, increase chance we include it
            iPlotHeight += iStartSectorWeight * iWaterHeight;
            // Start sector and less than 2/3rds of full distance from center, add that amount again
            if (iPercentFromCenter < (globals.g_IgnoreStartSectorPctFromCtr * 2 / 3)) {
                iPlotHeight += iStartSectorWeight * iWaterHeight;
            }
        }
        // Interior sector that isn't a start sector? Give it the center bias
        if (iStartSectorCols > 2 && iStartSectorRows > 2) {
            let iTestSector = iSector;
            if (iTestSector >= iStartSectorRows * iStartSectorCols) {
                iTestSector = iSector - (iStartSectorRows * iStartSectorCols);
            }
            if ((iTestSector % iStartSectorCols) > 0 && (iTestSector % iStartSectorCols) < (iStartSectorCols - 1)) {
                if (iTestSector >= iStartSectorCols && iTestSector < (iStartSectorRows * iStartSectorCols - iStartSectorCols)) {
                    iPlotHeight += iCenterWeight * iWaterHeight;
                }
            }
        }
    }
    //*/
    return iPlotHeight;
}
export function createOrganicLandmasses(iWidth, iHeight, continent1, continent2, iFractalGrain, iWaterPercent, iLargestContinentPercent, fWaterPercentFactor) {
    let bLargeEnoughFound = false;
    while (!bLargeEnoughFound) {
        let iFlags = 0;
        iFlags = 1; // FRAC_WRAP_X
        iFlags += 2; // FRAC_WRAP_Y
        FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, iFractalGrain, iFlags);
        let iWaterHeight = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, iWaterPercent * 1.25);//fWaterPercentFactor);
        console.log("iWaterHeight = " + iWaterHeight);
        console.log("continent2.west = " + continent2.west);
        // Apply the fractal as is
        for (let iY = 0; iY < iHeight; iY++) {
            for (let iX = 0; iX < iWidth; iX++) {
                let terrain = globals.g_OceanTerrain;
                let iPlotHeight = FractalBuilder.getHeight(globals.g_LandmassFractal, iX, iY);
                if (iPlotHeight >= iWaterHeight) {
                    terrain = globals.g_FlatTerrain;
                }
                TerrainBuilder.setTerrainType(iX, iY, terrain);
            }
        }
        // Shift it vertically and horizontally so the most water-filled rows & columns are where
        // we want them
        utilities.shiftTerrain(iWidth, iHeight);
        // Add the gutters at the top of the map and along the world wrap
        let iTilesChoppedInGutter = 0;
        for (let iY = 0; iY < iHeight; iY++) {
            for (let iX = 0; iX < iWidth; iX++) {
                if (GameplayMap.getTerrainType(iX, iY) != globals.g_OceanTerrain) {
                    // Top and bottom
                    if (iY < continent1.south || iY > continent1.north) {
                        TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
                    }
                    // Random feathering
                    else if (iY == continent1.south || iY == continent1.north) {
                        if (TerrainBuilder.getRandomNumber(2, "Feather hard edges") == 0) {
                            TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
                        }
                    }
                    // Now gutter along world wrap
                    if (iX < continent1.west || iX > (continent2.east - 1)) {
                        TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
                    }
                    // Random feathering
                    else if (iX == continent1.west || iX == (continent2.east - 1)) {
                        if (TerrainBuilder.getRandomNumber(2, "Feather hard edges") == 0) {
                            TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
                        }
                    }
                    // Finally gutter between hemispheres
                    if (iX > (continent1.east - 1) && iX < continent2.west) {
                        iTilesChoppedInGutter = iTilesChoppedInGutter + 1;
                        TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
                    }
                    // Random feathering
                    else if (iX == (continent1.east - 1) || iX == continent2.west) {
                        if (TerrainBuilder.getRandomNumber(2, "Feather hard edges") == 0) {
                            TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
                        }
                    }
                }
            }
        }
        // Keep trying if we just had to chop a LOT of tiles down the gutter (which leads to long, straight lines)
        console.log("Tiles in Center Gutter:" + iTilesChoppedInGutter);
        let iMaxTilesToChop = iHeight * (continent2.west - continent1.east) / 2;
        console.log("Max Tiles to Chop: " + iMaxTilesToChop);
        if (iTilesChoppedInGutter >= iMaxTilesToChop) {
            console.log("Fail. Too many tiles lost in center gutter");
        }
        else {
            // Now check that largest continent is big enough
            AreaBuilder.recalculateAreas();
            let iAreaID = AreaBuilder.findBiggestArea(false);
            let iPlotCount = AreaBuilder.getPlotCount(iAreaID);
            console.log("Plots in Largest Landmass:" + iPlotCount);
            let iPlotsNeeded = 1;//iWidth * iHeight * iLargestContinentPercent / 100;
            console.log("Plots Needed:" + iPlotsNeeded);
            if (iPlotCount >= iPlotsNeeded) {
                console.log("Useable continent found");
                bLargeEnoughFound = true;
            }
        }
    }
}
console.log("Loaded Desu Map Utilities");

//# sourceMappingURL=file:///base-standard/maps/map-utilities.js.map
