// Helper to pause execution and respect Golemio's API rate limits
const delay = ms => new Promise(res => setTimeout(res, ms));

// Helper to remove diacritics and make text lowercase for easy searching
const normalizeText = (text) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

// Load saved values on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('golemioApiKey');
    const savedStationName = localStorage.getItem('golemioStationName');
    const savedPlatformCode = localStorage.getItem('golemioPlatformCode');
    const savedTramLines = localStorage.getItem('golemioTramLines');

    if (savedApiKey) document.getElementById('apiKey').value = savedApiKey;
    if (savedStationName) document.getElementById('stationName').value = savedStationName;
    if (savedPlatformCode) document.getElementById('platformCode').value = savedPlatformCode;
    if (savedTramLines) document.getElementById('tramLines').value = savedTramLines;
});

document.getElementById('fetchDataBtn').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const stationNameInput = document.getElementById('stationName').value;
    const platformCodeRaw = document.getElementById('platformCode').value;
    const tramLinesRaw = document.getElementById('tramLines').value;
    const resultsDiv = document.getElementById('results');

    if (!apiKey || !stationNameInput) {
        resultsDiv.innerHTML = '<p class="error">Please provide both the API Key and Station Name.</p>';
        return;
    }

    // Save values to localStorage
    localStorage.setItem('golemioApiKey', apiKey);
    localStorage.setItem('golemioStationName', stationNameInput);
    localStorage.setItem('golemioPlatformCode', platformCodeRaw);
    localStorage.setItem('golemioTramLines', tramLinesRaw);

    const allowedLines = tramLinesRaw.split(',').map(line => line.trim()).filter(line => line !== '');
    const searchName = normalizeText(stationNameInput);
    
    // Normalize user's platform input to uppercase (e.g. 'a' -> 'A')
    const platformCodeInput = platformCodeRaw.trim().toUpperCase();

    resultsDiv.innerHTML = '<p class="loading">Looking up station IDs from stops.txt...</p>';

    try {
        // --- 1. Fetch and parse stops.txt ---
        const stopsResponse = await fetch('stops.txt');
        if (!stopsResponse.ok) throw new Error("Could not load stops.txt file. Make sure it is in the same folder.");
        
        const stopsText = await stopsResponse.text();
        const lines = stopsText.split('\n');
        
        const matchedStopIds = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const columns = lines[i].split(',');
            const id = columns[0];
            const name = columns[1].replace(/"/g, ''); 
            // Platform code is at index 10. Remove quotes and make uppercase just in case.
            const platform = columns[10] ? columns[10].replace(/"/g, '').trim().toUpperCase() : '';
            
            if (normalizeText(name) === searchName && !matchedStopIds.includes(id)) {
                // If user didn't specify a platform OR it matches what they typed, keep the ID
                if (!platformCodeInput || platform === platformCodeInput) {
                    matchedStopIds.push(id);
                }
            }
        }

        if (matchedStopIds.length === 0) {
            if (platformCodeInput) {
                resultsDiv.innerHTML = `<p class="error">Could not find any station matching "${stationNameInput}" at Platform "${platformCodeInput}" in stops.txt.</p>`;
            } else {
                resultsDiv.innerHTML = `<p class="error">Could not find any station matching "${stationNameInput}" in stops.txt.</p>`;
            }
            return;
        }

        resultsDiv.innerHTML = `<p class="loading">Found ${matchedStopIds.length} matching platform(s). Fetching live future departures...</p>`;

        // --- 2. Fetch Departure Boards for EACH matched platform sequentially ---
        let allDepartures = [];

        for (const stopId of matchedStopIds) {
            const depUrl = `https://api.golemio.cz/v2/pid/departureboards?ids=${stopId}&minutesBefore=0&minutesAfter=120&mode=departures&order=real&limit=50`;
            
            try {
                const depResponse = await fetch(depUrl, {
                    method: 'GET',
                    headers: { 'accept': 'application/json', 'X-Access-Token': apiKey }
                });

                if (depResponse.ok) {
                    const depData = await depResponse.json();
                    if (depData.departures) {
                        allDepartures.push(...depData.departures);
                    }
                }
            } catch (err) {
                console.warn(`Failed to fetch platform ${stopId}:`, err);
            }

            // Small delay between platform requests to protect rate limit
            await delay(200); 
        }

        if (allDepartures.length === 0) {
            resultsDiv.innerHTML = '<p>No upcoming departures found at this time.</p>';
            return;
        }

        // --- 3. Sort all combined departures chronologically ---
        allDepartures.sort((a, b) => {
            const timeA = new Date(a.departure_timestamp.predicted || a.departure_timestamp.scheduled);
            const timeB = new Date(b.departure_timestamp.predicted || b.departure_timestamp.scheduled);
            return timeA - timeB;
        });

        resultsDiv.innerHTML = ''; 

        const now = new Date();
        let renderedCount = 0; 

        // --- 4. Loop through sorted departures and fetch tram types ---
        for (const dep of allDepartures) {
            if (renderedCount >= 5) break;

            const timeRaw = dep.departure_timestamp.predicted || dep.departure_timestamp.scheduled;
            const departureTime = new Date(timeRaw);

            if (departureTime < now) continue;

            const line = dep.route.short_name;

            if (allowedLines.length > 0 && !allowedLines.includes(line)) {
                continue;
            }

            const tripId = dep.trip.id;
            const headsign = dep.trip.headsign || 'Unknown Destination';
            const platform = dep.stop.platform_code || '?'; 
            const timeFormatted = departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            let tramType = 'Type Unknown';

            if (tripId) {
                try {
                    const posResponse = await fetch(`https://api.golemio.cz/v2/vehiclepositions/${tripId}?preferredTimezone=Europe_Prague`, {
                        method: 'GET',
                        headers: { 'accept': 'application/json', 'X-Access-Token': apiKey }
                    });

                    if (posResponse.ok) {
                        const posData = await posResponse.json();
                        const regNumber = posData.properties?.trip?.vehicle_registration_number;

                        if (regNumber) {
                            const descResponse = await fetch(`https://api.golemio.cz/v2/public/vehiclepositions/service-0-${regNumber}?scopes=vehicle_descriptor`, {
                                method: 'GET',
                                headers: { 'accept': 'application/json; charset=utf-8', 'X-Access-Token': apiKey }
                            });

                            if (descResponse.ok) {
                                const descData = await descResponse.json();
                                tramType = descData.vehicle_descriptor?.vehicle_type || 'Unknown Model';
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`Failed to fetch nested data for trip ${tripId}:`, err);
                }
            }

            // Render the data to the DOM
            const card = document.createElement('div');
            card.className = 'tram-card';
            card.innerHTML = `
                <div class="tram-head"><strong>Line ${line}</strong> ➔ <strong>${headsign}</strong> (Platform ${platform})</div>
                <div class="tram-meta">Departs at ${timeFormatted} &nbsp;|&nbsp; Tram: <strong>${tramType}</strong></div>
            `;
            resultsDiv.appendChild(card);
            
            renderedCount++;
            
            // Wait 500ms before next iteration to respect API rate limits
            await delay(500); 
        }

        if (resultsDiv.innerHTML === '') {
            resultsDiv.innerHTML = '<p>No matching future departures found for those filters within the next 2 hours.</p>';
        }

    } catch (error) {
        resultsDiv.innerHTML = `<p class="error">An error occurred: ${error.message}</p>`;
    }
});