// Incident location
const incidentLocation = [-118.24727530262695, 34.04353275097726];

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
        const freewaysLayer = new GraphicsLayer({ title: "Freeways" });
        const exitsLayer = new GraphicsLayer({ title: "Exits" });
        const incidentLayer = new GraphicsLayer({ title: "Incident" });

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

        // Add layers to map
        map.addMany([freewaysLayer, exitsLayer, incidentLayer]);

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
                } else if (graphic.attributes && graphic.attributes.title === "Incident Location") {
                    showIncidentPopup();
                }
            } else {
                hidePopup();
            }
        });

        // Event handlers
        setupEventHandlers();

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
function setupEventHandlers() {
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
}

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMap);
} else {
    initializeMap();
}
