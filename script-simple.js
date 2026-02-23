// Incident location
const incidentLocation = [-118.24727530262695, 34.04353275097726];

// Function to determine freeway from exit reference and coordinates
function determineFreeway(ref, coords) {
    if (!ref || ref === 'No Ref') {
        // Use coordinates to determine freeway
        const lon = coords[0];
        const lat = coords[1];
        
        // I-10 runs east-west along the south (roughly lat 34.02-34.05, lon -118.24 to -118.16)
        if (lat >= 34.015 && lat <= 34.055 && lon >= -118.24 && lon <= -118.15) {
            return 'I-10';
        }
        // US-101 runs along east and north edges
        if ((lat >= 34.055 && lat <= 34.11) || (lon >= -118.23 && lon <= -118.19 && lat >= 34.07)) {
            return 'US-101';
        }
        // I-110 runs north-south along the west
        if (lon <= -118.24 && lat >= 34.02 && lat <= 34.08) {
            return 'I-110';
        }
        return 'Unknown';
    }
    
    // Parse the reference number
    const refNum = parseInt(ref.replace(/[A-Z]/g, ''));
    
    // I-10 exits: 1D, 15-16, 129-135
    if (ref.includes('1D') || (refNum >= 15 && refNum <= 16) || (refNum >= 129 && refNum <= 135)) {
        return 'I-10';
    }
    
    // I-110 exits: 12-24
    if (refNum >= 12 && refNum <= 24) {
        return 'I-110';
    }
    
    // US-101 exits: 2-5, 25-29, 137-141
    if ((refNum >= 2 && refNum <= 5) || (refNum >= 25 && refNum <= 29) || (refNum >= 137 && refNum <= 141)) {
        return 'US-101';
    }
    
    // Default: use coordinates
    return determineFreeway('', coords);
}

// Function to get freeway color
function getFreewayColor(freeway) {
    switch(freeway) {
        case 'I-10': return '#FF0000';
        case 'US-101': return '#0066FF';
        case 'I-110': return '#00AA00';
        default: return '#999999';
    }
}

// Accurate exit data extracted from OpenStreetMap GeoJSON
// Organized clockwise around the Skid Row freeway loop
const exits = [
    // I-110 Segment (North to South) - West edge - Starting from Four Level
    { num: 1, name: "US-101 (Four Level Interchange)", freeway: "I-110", coords: [-118.2518519, 34.0598866], ref: "24A" },
    { num: 2, name: "Hill St / Civic Center", freeway: "I-110", coords: [-118.241274, 34.0662594], ref: "24B" },
    { num: 3, name: "6th St / 9th St", freeway: "I-110", coords: [-118.2666035, 34.0344255], ref: "13" },
    { num: 4, name: "Adams Blvd", freeway: "I-110", coords: [-118.28685, 34.0368014], ref: "13A" },
    { num: 5, name: "Exposition Blvd", freeway: "I-110", coords: [-118.2572282, 34.030077], ref: "14B" },
    { num: 6, name: "I-10 (Santa Monica Fwy)", freeway: "I-110", coords: [-118.2436, 34.0237846], ref: "15A" },
    
    // I-10 Segment (West to East) - South edge
    { num: 7, name: "I-110 / Harbor Fwy", freeway: "I-10", coords: [-118.237005, 34.0254978], ref: "16A" },
    { num: 8, name: "Grand Ave / Olive St", freeway: "I-10", coords: [-118.2225479, 34.049988], ref: "1D" },
    { num: 9, name: "Los Angeles St", freeway: "I-10", coords: [-118.214553, 34.047287], ref: "135B" },
    { num: 10, name: "Alameda St", freeway: "I-10", coords: [-118.2139046, 34.0511029], ref: "135C" },
    { num: 11, name: "US-101 / I-5 (East LA Interchange)", freeway: "I-10", coords: [-118.2189695, 34.0405274], ref: "East LA" },
    
    // US-101 Segment (South to North then West) - East and North edges
    { num: 12, name: "Alameda St / Mission Rd", freeway: "US-101", coords: [-118.2193243, 34.0848833], ref: "26A" },
    { num: 13, name: "Spring St / Main St", freeway: "US-101", coords: [-118.2250356, 34.0810016], ref: "26B" },
    { num: 14, name: "Broadway / Hill St", freeway: "US-101", coords: [-118.2311816, 34.0764317], ref: "25" },
    { num: 15, name: "Temple St", freeway: "US-101", coords: [-118.2581893, 34.0687318], ref: "4A" },
    { num: 16, name: "Grand Ave", freeway: "US-101", coords: [-118.2441147, 34.0579715], ref: "2C" },
    { num: 17, name: "Hill St", freeway: "US-101", coords: [-118.244475, 34.0584076], ref: "3" },
    { num: 18, name: "SR-110 (Four Level - completes loop)", freeway: "US-101", coords: [-118.2782446, 34.0763978], ref: "5B" }
];

let map, view, homeExtent;

// Load module helper
function loadModule(moduleName) {
    return new Promise((resolve, reject) => {
        require([moduleName], (module) => {
            if (module) resolve(module);
            else reject(new Error(`Module not found: ${moduleName}`));
        }, reject);
    });
}

// Initialize map
async function initializeMap() {
    try {
        const [
            Map,
            MapView,
            GraphicsLayer,
            Graphic,
            Point,
            TextSymbol,
            BasemapToggle
        ] = await Promise.all([
            loadModule("esri/Map"),
            loadModule("esri/views/MapView"),
            loadModule("esri/layers/GraphicsLayer"),
            loadModule("esri/Graphic"),
            loadModule("esri/geometry/Point"),
            loadModule("esri/symbols/TextSymbol"),
            loadModule("esri/widgets/BasemapToggle")
        ]);

        // Create map
        map = new Map({
            basemap: "streets-navigation-vector"
        });

        // Create view
        view = new MapView({
            container: "viewDiv",
            map: map,
            center: incidentLocation,
            zoom: 13
        });

        view.ui.remove(["zoom", "attribution"]);
        await view.when();
        homeExtent = view.extent.clone();

        // Create layers
        const freewaysLayer = new GraphicsLayer({ title: "Freeways", visible: false });
        const exitsLayer = new GraphicsLayer({ title: "Exits", visible: false });
        const motorwayJunctionsLayer = new GraphicsLayer({ title: "All Motorway Junctions", visible: true });
        const motorwayLinksLayer = new GraphicsLayer({ title: "All Motorway Links", visible: true });
        const incidentLayer = new GraphicsLayer({ title: "Incident", visible: true });

        // Load and draw freeways from GeoJSON
        const freewaysData = await loadGeoJSON("roads in LA.geojson");
        if (freewaysData) {
            for (const feature of freewaysData.features) {
                if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
                    const ref = feature.properties.ref || '';
                    let color = '#999999';
                    let width = 6;
                    
                    if (ref.includes('I 10') || ref.includes('I-10')) {
                        color = '#FF0000';
                        width = 8;
                    } else if (ref.includes('US 101') || ref.includes('101')) {
                        color = '#0066FF';
                        width = 8;
                    } else if (ref.includes('I 110') || ref.includes('110') || ref.includes('SR 110')) {
                        color = '#00AA00';
                        width = 8;
                    }

                    const paths = feature.geometry.type === 'LineString' 
                        ? [feature.geometry.coordinates]
                        : feature.geometry.coordinates;

                    const polyline = {
                        type: "polyline",
                        paths: paths
                    };

                    const graphic = new Graphic({
                        geometry: polyline,
                        symbol: {
                            type: "simple-line",
                            color: color,
                            width: width,
                            style: "solid",
                            cap: "round",
                            join: "round"
                        },
                        attributes: feature.properties
                    });

                    freewaysLayer.add(graphic);
                }
            }
        }

        // Add exit markers
        exits.forEach(exit => {
            const point = new Point({
                longitude: exit.coords[0],
                latitude: exit.coords[1]
            });

            // Exit circle marker
            const marker = new Graphic({
                geometry: point,
                symbol: {
                    type: "simple-marker",
                    color: "#FFD700",
                    size: 32,
                    outline: {
                        color: "#000000",
                        width: 3
                    }
                },
                attributes: exit
            });

            // Exit number label
            const label = new Graphic({
                geometry: point,
                symbol: {
                    type: "text",
                    color: "#000000",
                    text: exit.num.toString(),
                    font: {
                        size: 14,
                        weight: "bold",
                        family: "Arial"
                    }
                },
                attributes: exit
            });

            exitsLayer.addMany([marker, label]);
        });

        // Add incident marker
        const incidentPoint = new Point({
            longitude: incidentLocation[0],
            latitude: incidentLocation[1]
        });

        const incidentMarker = new Graphic({
            geometry: incidentPoint,
            symbol: {
                type: "simple-marker",
                color: "#FF00FF",
                size: 40,
                style: "circle",
                outline: {
                    color: "#000000",
                    width: 4
                }
            },
            attributes: {
                title: "Incident Location",
                date: "August 12"
            }
        });

        const incidentStar = new Graphic({
            geometry: incidentPoint,
            symbol: {
                type: "text",
                color: "#FFFFFF",
                text: "★",
                font: {
                    size: 24,
                    weight: "bold"
                }
            }
        });

        incidentLayer.addMany([incidentMarker, incidentStar]);

        // Load and display all motorway junctions
        const junctionsData = await loadGeoJSON("motorway_junction.geojson");
        if (junctionsData) {
            for (const feature of junctionsData.features) {
                if (feature.geometry.type === 'Point') {
                    const point = new Point({
                        longitude: feature.geometry.coordinates[0],
                        latitude: feature.geometry.coordinates[1]
                    });

                    const ref = feature.properties.ref || feature.properties.unsigned_ref || 'No Ref';
                    // COMMENTED: Color-coding by freeway
                    // const freeway = determineFreeway(ref, feature.geometry.coordinates);
                    // const color = getFreewayColor(freeway);
                    const freeway = 'All Junctions';
                    const color = '#FF6B35'; // Orange for all junctions
                    
                    // Adjust marker size based on text length
                    let markerSize = 18;
                    if (ref.length > 3) {
                        markerSize = 24; // Larger for longer text like "No Ref"
                    }
                    
                    // Junction marker (smaller than main exits, colored by freeway)
                    const marker = new Graphic({
                        geometry: point,
                        symbol: {
                            type: "simple-marker",
                            color: color,
                            size: markerSize,
                            outline: {
                                color: "#FFFFFF",
                                width: 2
                            }
                        },
                        attributes: {
                            ref: ref,
                            type: "Motorway Junction",
                            freeway: freeway,
                            coords: feature.geometry.coordinates,
                            ...feature.properties
                        }
                    });

                    // Junction label with enhanced styling
                    const label = new Graphic({
                        geometry: point,
                        symbol: {
                            type: "text",
                            color: "#FFFFFF",
                            text: ref,
                            font: {
                                size: ref.length > 3 ? 8 : 9, // Smaller font for longer text
                                weight: "bold",
                                family: "Arial"
                            },
                            haloColor: "#000000",
                            haloSize: 1.5,
                            yoffset: 0,
                            xoffset: 0
                        },
                        attributes: marker.attributes
                    });

                    motorwayJunctionsLayer.addMany([marker, label]);
                }
            }
        }

        // Load and display all motorway links (ramps)
        const linksData = await loadGeoJSON("motorway_link_Not_Just_Exit_Points.geojson");
        if (linksData) {
            for (const feature of linksData.features) {
                if (feature.geometry.type === 'LineString') {
                    const polyline = {
                        type: "polyline",
                        paths: [feature.geometry.coordinates]
                    };

                    // COMMENTED: Determine freeway from destination:ref or junction:ref or coordinates
                    // let freeway = 'Unknown';
                    // const destRef = feature.properties['destination:ref'] || '';
                    // const junctionRef = feature.properties['junction:ref'] || '';
                    // 
                    // // Check destination reference
                    // if (destRef.includes('I 10') || destRef.includes('I-10')) {
                    //     freeway = 'I-10';
                    // } else if (destRef.includes('US 101') || destRef.includes('101')) {
                    //     freeway = 'US-101';
                    // } else if (destRef.includes('I 110') || destRef.includes('110') || destRef.includes('CA 110')) {
                    //     freeway = 'I-110';
                    // } else if (junctionRef) {
                    //     // Use junction reference to determine freeway
                    //     const midPoint = feature.geometry.coordinates[Math.floor(feature.geometry.coordinates.length / 2)];
                    //     freeway = determineFreeway(junctionRef, midPoint);
                    // } else {
                    //     // Use midpoint coordinates
                    //     const midPoint = feature.geometry.coordinates[Math.floor(feature.geometry.coordinates.length / 2)];
                    //     freeway = determineFreeway('', midPoint);
                    // }
                    // 
                    // const color = getFreewayColor(freeway);
                    
                    const freeway = 'All Links';
                    const color = '#9C27B0'; // Purple for all links

                    const graphic = new Graphic({
                        geometry: polyline,
                        symbol: {
                            type: "simple-line",
                            color: color,
                            width: 3,
                            style: "solid",
                            cap: "round",
                            join: "round"
                        },
                        attributes: {
                            type: "Motorway Link",
                            freeway: freeway,
                            destination: feature.properties.destination || 'N/A',
                            ref: feature.properties['destination:ref'] || 'N/A',
                            ...feature.properties
                        }
                    });

                    motorwayLinksLayer.add(graphic);
                }
            }
        }

        // Add layers to map
        map.addMany([freewaysLayer, motorwayLinksLayer, motorwayJunctionsLayer, exitsLayer, incidentLayer]);

        // Add basemap toggle
        const basemapToggle = new BasemapToggle({
            view: view,
            nextBasemap: "satellite"
        });
        view.ui.add(basemapToggle, "bottom-left");

        // Setup click handler for exits with custom popup
        view.on("click", async (event) => {
            const response = await view.hitTest(event);
            if (response.results.length > 0) {
                const graphic = response.results[0].graphic;
                if (graphic.attributes && graphic.attributes.num) {
                    showExitPopup(graphic.attributes);
                } else if (graphic.attributes && graphic.attributes.type === "Motorway Junction") {
                    showJunctionPopup(graphic.attributes);
                } else if (graphic.attributes && graphic.attributes.type === "Motorway Link") {
                    showLinkPopup(graphic.attributes);
                } else if (graphic.attributes && graphic.attributes.title === "Incident Location") {
                    showIncidentPopup();
                }
            } else {
                hidePopup();
            }
        });

        // Event handlers
        setupEventHandlers(freewaysLayer, exitsLayer, motorwayJunctionsLayer, motorwayLinksLayer, incidentLayer);

        console.log("Simplified map loaded successfully");

    } catch (error) {
        console.error("Error initializing map:", error);
        alert("Error loading map. Please check console.");
    }
}

// Show custom exit popup
function showExitPopup(exit) {
    const popup = document.getElementById('customPopup');
    const title = document.getElementById('popupTitle');
    const body = document.getElementById('popupBody');
    
    // Get freeway color
    let freewayColor = '#999';
    if (exit.freeway === 'I-10') freewayColor = '#FF0000';
    else if (exit.freeway === 'US-101') freewayColor = '#0066FF';
    else if (exit.freeway === 'I-110') freewayColor = '#00AA00';
    
    title.innerHTML = `<i class="fas fa-road"></i> Exit ${exit.num}`;
    
    body.innerHTML = `
        <div class="popup-exit-info">
            <div class="popup-exit-header" style="background: ${freewayColor};">
                <div class="exit-number">${exit.num}</div>
                <div class="exit-details">
                    <div class="exit-name">${exit.name}</div>
                    <div class="exit-freeway">${exit.freeway}</div>
                </div>
            </div>
            <div class="popup-exit-body">
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-map-marker-alt"></i></span>
                    <div class="info-content">
                        <span class="info-label">Location</span>
                        <span class="info-value">${exit.coords[1].toFixed(6)}°N, ${Math.abs(exit.coords[0]).toFixed(6)}°W</span>
                    </div>
                </div>
                ${exit.ref ? `
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-sign"></i></span>
                    <div class="info-content">
                        <span class="info-label">Exit Reference</span>
                        <span class="info-value">${exit.ref}</span>
                    </div>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-road"></i></span>
                    <div class="info-content">
                        <span class="info-label">Freeway</span>
                        <span class="info-value">${exit.freeway}</span>
                    </div>
                </div>
            </div>
            <div class="popup-actions">
                <button class="popup-btn primary" onclick="zoomToExit(${exit.coords[0]}, ${exit.coords[1]})">
                    <i class="fas fa-search-plus"></i> Zoom to Exit
                </button>
                <button class="popup-btn secondary" onclick="hidePopup()">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    popup.classList.remove('hidden');
}

// Show motorway junction popup
function showJunctionPopup(junction) {
    const popup = document.getElementById('customPopup');
    const title = document.getElementById('popupTitle');
    const body = document.getElementById('popupBody');
    
    // COMMENTED: Color-coding by freeway
    // const freewayColor = getFreewayColor(junction.freeway);
    const freewayColor = '#FF6B35'; // Orange for all
    
    title.innerHTML = `<i class="fas fa-map-signs"></i> Motorway Junction`;
    
    body.innerHTML = `
        <div class="popup-exit-info">
            <div class="popup-exit-header" style="background: ${freewayColor};">
                <div class="exit-number">${junction.ref}</div>
                <div class="exit-details">
                    <div class="exit-name">Exit Reference: ${junction.ref}</div>
                    <div class="exit-freeway">Motorway Junction</div>
                </div>
            </div>
            <div class="popup-exit-body">
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-map-marker-alt"></i></span>
                    <div class="info-content">
                        <span class="info-label">Location</span>
                        <span class="info-value">${junction.coords[1].toFixed(6)}°N, ${Math.abs(junction.coords[0]).toFixed(6)}°W</span>
                    </div>
                </div>
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-sign"></i></span>
                    <div class="info-content">
                        <span class="info-label">Exit Reference</span>
                        <span class="info-value">${junction.ref}</span>
                    </div>
                </div>
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-road"></i></span>
                    <div class="info-content">
                        <span class="info-label">Type</span>
                        <span class="info-value">Motorway Junction</span>
                    </div>
                </div>
            </div>
            <div class="popup-actions">
                <button class="popup-btn primary" onclick="zoomToExit(${junction.coords[0]}, ${junction.coords[1]})">
                    <i class="fas fa-search-plus"></i> Zoom to Junction
                </button>
                <button class="popup-btn secondary" onclick="hidePopup()">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    popup.classList.remove('hidden');
}

// Show motorway link popup
function showLinkPopup(link) {
    const popup = document.getElementById('customPopup');
    const title = document.getElementById('popupTitle');
    const body = document.getElementById('popupBody');
    
    const linkColor = '#9C27B0'; // Purple for all links
    
    title.innerHTML = `<i class="fas fa-road"></i> Motorway Link (Ramp)`;
    
    const destination = link.destination || 'N/A';
    const destRef = link.ref || 'N/A';
    const highway = link.highway || 'motorway_link';
    const lanes = link.lanes || 'N/A';
    const oneway = link.oneway === 'yes' ? 'Yes' : 'No';
    
    body.innerHTML = `
        <div class="popup-exit-info">
            <div class="popup-exit-header" style="background: ${linkColor};">
                <div class="exit-details" style="width: 100%;">
                    <div class="exit-name" style="font-size: 18px;">${destination}</div>
                    <div class="exit-freeway">Motorway Link / Ramp</div>
                </div>
            </div>
            <div class="popup-exit-body">
                ${destination !== 'N/A' ? `
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-map-signs"></i></span>
                    <div class="info-content">
                        <span class="info-label">Destination</span>
                        <span class="info-value">${destination}</span>
                    </div>
                </div>
                ` : ''}
                ${destRef !== 'N/A' ? `
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-route"></i></span>
                    <div class="info-content">
                        <span class="info-label">Destination Reference</span>
                        <span class="info-value">${destRef}</span>
                    </div>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-road"></i></span>
                    <div class="info-content">
                        <span class="info-label">Type</span>
                        <span class="info-value">${highway}</span>
                    </div>
                </div>
                ${lanes !== 'N/A' ? `
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-grip-lines"></i></span>
                    <div class="info-content">
                        <span class="info-label">Lanes</span>
                        <span class="info-value">${lanes}</span>
                    </div>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-arrow-right"></i></span>
                    <div class="info-content">
                        <span class="info-label">One-Way</span>
                        <span class="info-value">${oneway}</span>
                    </div>
                </div>
            </div>
            <div class="popup-actions">
                <button class="popup-btn secondary" onclick="hidePopup()">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    popup.classList.remove('hidden');
}

// Show incident popup
function showIncidentPopup() {
    const popup = document.getElementById('customPopup');
    const title = document.getElementById('popupTitle');
    const body = document.getElementById('popupBody');
    
    title.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Incident Location`;
    
    body.innerHTML = `
        <div class="popup-incident-info">
            <div class="incident-alert">
                <i class="fas fa-exclamation-circle"></i>
                <span>August 12 Incident</span>
            </div>
            <div class="popup-exit-body">
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-calendar-day"></i></span>
                    <div class="info-content">
                        <span class="info-label">Date</span>
                        <span class="info-value">August 12</span>
                    </div>
                </div>
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-map-pin"></i></span>
                    <div class="info-content">
                        <span class="info-label">Coordinates</span>
                        <span class="info-value">34.04353°N, 118.24728°W</span>
                    </div>
                </div>
                <div class="info-row">
                    <span class="info-icon"><i class="fas fa-map-marked-alt"></i></span>
                    <div class="info-content">
                        <span class="info-label">Address</span>
                        <span class="info-value">Los Angeles, CA 90014</span>
                    </div>
                </div>
            </div>
            <div class="popup-actions">
                <button class="popup-btn primary" onclick="zoomToExit(${incidentLocation[0]}, ${incidentLocation[1]})">
                    <i class="fas fa-crosshairs"></i> Zoom to Incident
                </button>
                <button class="popup-btn secondary" onclick="hidePopup()">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    popup.classList.remove('hidden');
}

// Hide popup
function hidePopup() {
    const popup = document.getElementById('customPopup');
    popup.classList.add('hidden');
}

// Zoom to exit
window.zoomToExit = function(lon, lat) {
    view.goTo({
        center: [lon, lat],
        zoom: 17
    }, {
        duration: 1000,
        easing: "ease-in-out"
    });
};

// Load GeoJSON
async function loadGeoJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${url}:`, error);
        return null;
    }
}

// Setup event handlers
function setupEventHandlers(freewaysLayer, exitsLayer, junctionsLayer, linksLayer, incidentLayer) {
    document.getElementById('zoomInBtn').addEventListener('click', () => {
        view.zoom += 1;
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        view.zoom -= 1;
    });

    document.getElementById('homeBtn').addEventListener('click', () => {
        if (homeExtent) {
            view.goTo(homeExtent, { duration: 1000, easing: "ease-in-out" });
        }
    });

    // Toggle layer list panel
    const toggleLayerListBtn = document.getElementById('toggleLayerList');
    const layerListPanel = document.getElementById('layerListPanel');
    const closeLayerListBtn = document.getElementById('closeLayerList');

    // Set initial state - layer list is open by default
    toggleLayerListBtn.classList.add('active');

    toggleLayerListBtn.addEventListener('click', () => {
        layerListPanel.classList.toggle('visible');
        toggleLayerListBtn.classList.toggle('active');
    });

    closeLayerListBtn.addEventListener('click', () => {
        layerListPanel.classList.remove('visible');
        toggleLayerListBtn.classList.remove('active');
    });

    // Layer visibility controls
    const layerMap = {
        'freeways': freewaysLayer,
        'exits': exitsLayer,
        'junctions': junctionsLayer,
        'links': linksLayer,
        'incident': incidentLayer
    };

    // Update legend based on visible layers
    function updateLegend() {
        const legendContent = document.getElementById('legendContent');
        legendContent.innerHTML = '';

        // Freeways legend
        if (freewaysLayer.visible) {
            legendContent.innerHTML += `
                <div class="legend-item">
                    <div class="legend-line" style="background: #FF0000;"></div>
                    <span class="legend-text">I-10 (South)</span>
                </div>
                <div class="legend-item">
                    <div class="legend-line" style="background: #0066FF;"></div>
                    <span class="legend-text">US-101 (East/North)</span>
                </div>
                <div class="legend-item">
                    <div class="legend-line" style="background: #00AA00;"></div>
                    <span class="legend-text">I-110 (West)</span>
                </div>
            `;
        }

        // Main exits legend
        if (exitsLayer.visible) {
            legendContent.innerHTML += `
                <div class="legend-item">
                    <div class="legend-symbol" style="background: #FFD700; color: #000;">1</div>
                    <span class="legend-text">Old Exit Numbers</span>
                </div>
            `;
        }

        // Motorway junctions legend
        if (junctionsLayer.visible) {
            legendContent.innerHTML += `
                <div class="legend-item">
                    <div class="legend-symbol" style="background: #FF6B35; color: #FFF; font-size: 10px;">24A</div>
                    <span class="legend-text">All Motorway Junctions</span>
                </div>
            `;
        }

        // Motorway links legend
        if (linksLayer.visible) {
            legendContent.innerHTML += `
                <div class="legend-item">
                    <div class="legend-line" style="background: #9C27B0; height: 4px;"></div>
                    <span class="legend-text">Motorway Links (Ramps)</span>
                </div>
            `;
        }

        // Incident location legend
        if (incidentLayer.visible) {
            legendContent.innerHTML += `
                <div class="legend-item">
                    <div class="legend-symbol" style="background: #FF00FF;">★</div>
                    <span class="legend-text">Incident Location</span>
                </div>
            `;
        }

        // Show message if no layers are visible
        if (legendContent.innerHTML === '') {
            legendContent.innerHTML = '<p style="color: #999; font-size: 14px; padding: 10px; text-align: center;">No layers visible</p>';
        }
    }

    // Initial legend update
    updateLegend();

    // Add event listeners to all layer checkboxes
    document.querySelectorAll('.layer-checkbox input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const layerName = e.target.getAttribute('data-layer');
            const layer = layerMap[layerName];
            if (layer) {
                layer.visible = e.target.checked;
                updateLegend(); // Update legend when layer visibility changes
            }
        });
    });
}

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMap);
} else {
    initializeMap();
}
