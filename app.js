document.addEventListener("DOMContentLoaded", async () => {
    // ---- App Logic & Audio Setup ----

    // ---- App Logic & Audio Setup ----
    let db = [];
    try {
        const res = await fetch('data/db.json?t=' + Date.now());
        if (res.ok) db = await res.json();
    } catch (e) {
        console.error("Failed to load db.json", e);
    }

    if (db.length === 0) {
        document.querySelector('.tap-text').innerText = "DATA NOT FOUND";
        return;
    }

    let currentEP = null;
    let timeoutId = null;

    // UI Elements
    const signageMode = document.getElementById("signage-mode");
    const epSelectionMode = document.getElementById("ep-selection-mode");
    const catalogMode = document.getElementById("catalog-mode");
    const catalogContainer = document.getElementById("catalog-container");
    
    const epListContainer = document.getElementById("ep-list");
    const jacketBgContainer = document.getElementById("jacket-bg-container");
    const jacketBg = document.getElementById("jacket-bg");
    const currentJacketImg = document.getElementById("current-jacket");
    
    const epTitleDisplay = document.getElementById("ep-title-display");
    const epArtistDisplay = document.getElementById("ep-artist-display");
    const catalogPrice = document.getElementById("catalog-price");
    const catalogTracks = document.getElementById("catalog-tracks");
    const catalogDesc = document.getElementById("catalog-desc");
    
    const teaserVideo = document.getElementById("teaser-video");

    const marqueeObserver = new ResizeObserver((entries) => {
        window.requestAnimationFrame(() => {
            for (let entry of entries) {
                checkMarquee(entry.target);
            }
        });
    });

    function checkMarquee(contentEl) {
        if (!contentEl) return;
        const container = contentEl.parentElement;
        if (!container || !container.classList.contains('marquee-container')) return;
        
        // Save state
        const wasOverflowing = container.classList.contains('is-overflowing');
        const currentAnim = contentEl.style.animation;
        
        // Reset to measure
        contentEl.style.animation = 'none';
        contentEl.style.paddingRight = '0px';
        
        const isOverflow = contentEl.scrollWidth > container.clientWidth + 5;
        const trueScrollWidth = contentEl.scrollWidth;
        const clientWidth = container.clientWidth;
        const newDist = clientWidth - (trueScrollWidth + 80);
        const storedDist = parseFloat(contentEl.dataset.dist || "0");
        
        if (isOverflow) {
            if (wasOverflowing && Math.abs(storedDist - newDist) < 5 && currentAnim && currentAnim !== 'none') {
                contentEl.style.paddingRight = '80px';
                contentEl.style.animation = currentAnim;
                return;
            }
            
            container.classList.add('is-overflowing');
            contentEl.style.paddingRight = '80px';
            contentEl.dataset.dist = newDist;
            contentEl.style.setProperty('--scroll-dist', `${newDist}px`);
            
            void contentEl.offsetWidth;
            contentEl.style.animation = 'marquee-scroll 10s linear infinite alternate';
        } else {
            container.classList.remove('is-overflowing');
            contentEl.dataset.dist = "0";
            contentEl.style.removeProperty('--scroll-dist');
        }
    }

    if (epTitleDisplay) marqueeObserver.observe(epTitleDisplay);

    function getEPTeaser(ep) {
        if (!ep) return null;
        if (ep.teasers && ep.teasers.length > 0) {
            const totalWeight = ep.teasers.reduce((sum, t) => sum + (t.weight || 1), 0);
            let rand = Math.random() * totalWeight;
            for (const t of ep.teasers) {
                if (rand < (t.weight || 1)) return t.src;
                rand -= (t.weight || 1);
            }
            return ep.teasers[0].src;
        }
        return ep.teaser || null;
    }

    // Populate EP Selection Carousel and Teaser List
    let teaserList = [];
    db.forEach((ep) => {
        if (ep.teasers && ep.teasers.length > 0) {
            ep.teasers.forEach(t => {
                if (t.src && !teaserList.includes(t.src)) teaserList.push(t.src);
            });
        } else if (ep.teaser && !teaserList.includes(ep.teaser)) {
            teaserList.push(ep.teaser);
        }
    });

    let artistsInfo = []; 
    let currentArtistFilterIndex = -1; // -1 means All artists
    let previousTeaserSrc = null;

    db.forEach(ep => {
        if (ep.id && ep.id.startsWith("comp_")) return; // Exclude compilations from filters
        if (!artistsInfo.find(a => a.name === ep.artist)) {
            artistsInfo.push({ name: ep.artist, img: ep.artist_img || '' });
        }
    });

    const artistFilterList = document.getElementById("artist-filter-list");
    let artistDOMNodes = [];
    let epDOMNodes = [];

    function initArtistFilters() {
        if (!artistFilterList) return;
        artistFilterList.innerHTML = "";
        
        artistsInfo.forEach((artist, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "artist-avatar-wrapper";
            
            let imgPath = artist.img;
            if (!imgPath) {
                imgPath = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M12%2012c2.21%200%204-1.79%204-4s-1.79-4-4-4-4%201.79-4%204%201.79%204%204%204zm0%202c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4z%22%2F%3E%3C%2Fsvg%3E";
            }
            
            wrapper.innerHTML = `
                <img src="${imgPath}" alt="${artist.name}" style="${!artist.img ? 'background-color: rgba(150, 150, 150, 0.5);' : ''}">
                <div class="close-badge">✕</div>
            `;
            
            wrapper.addEventListener("click", () => {
                const titleElement = document.querySelector('.ep-selection-title');
                if (currentArtistFilterIndex === index) {
                    currentArtistFilterIndex = -1; // Deselect
                    if (titleElement) titleElement.innerText = "SELECT EP";
                } else {
                    currentArtistFilterIndex = index; // Select
                    const selectedArtist = artistsInfo[index].name;
                    if (titleElement) titleElement.innerText = selectedArtist;
                    const firstMatchingEP = db.find(e => e.artist === selectedArtist && getEPTeaser(e));
                    if (firstMatchingEP) {
                        changeTeaserVideo(getEPTeaser(firstMatchingEP));
                    }
                }
                updateArtistFilters();
                updateEPCarousel();
            });
            
            artistFilterList.appendChild(wrapper);
            artistDOMNodes.push(wrapper);
        });
    }

    function initEPCarousel() {
        epListContainer.innerHTML = "";
        db.forEach((ep, i) => {
            const card = document.createElement("div");
            card.className = "ep-card";
            card.innerHTML = `
                <img src="${ep.jacket || ''}" alt="Jacket">
                <div class="ep-card-artist">${ep.artist}</div>
                <div class="ep-card-title">${ep.title}</div>
            `;
            card.addEventListener("click", () => selectEP(i));
            epListContainer.appendChild(card);
            epDOMNodes.push({ card, artist: ep.artist });
        });
    }

    function updateArtistFilters() {
        artistDOMNodes.forEach((wrapper, index) => {
            wrapper.classList.remove("selected", "hidden");
            if (currentArtistFilterIndex === index) {
                wrapper.classList.add("selected");
            } else if (currentArtistFilterIndex !== -1) {
                wrapper.classList.add("hidden");
            }
        });
    }

    function updateEPCarousel() {
        let displayCount = 0;
        epDOMNodes.forEach((node, index) => {
            const ep = db[index];
            if (currentArtistFilterIndex !== -1) {
                const selectedArtist = artistsInfo[currentArtistFilterIndex].name;
                
                let isMatch = node.artist === selectedArtist;
                if (!isMatch && ep.id && ep.id.startsWith("comp_")) {
                    if (ep.description && ep.description.includes(selectedArtist)) {
                        isMatch = true;
                    }
                }

                if (isMatch) {
                    node.card.style.display = "block";
                    node.card.style.animation = 'none';
                    void node.card.offsetWidth; // Force reflow
                    node.card.style.animation = `swoopIn 1.2s cubic-bezier(0.19, 1, 0.22, 1) forwards ${displayCount * 0.1}s`;
                    displayCount++;
                } else {
                    node.card.style.display = "none";
                }
            } else {
                if (ep.id && ep.id.startsWith("comp_")) {
                    node.card.style.display = "none";
                } else {
                    node.card.style.display = "block";
                    node.card.style.animation = 'none';
                    void node.card.offsetWidth; // Force reflow
                    node.card.style.animation = `swoopIn 1.2s cubic-bezier(0.19, 1, 0.22, 1) forwards ${displayCount * 0.1}s`;
                    displayCount++;
                }
            }
        });
    }

    initArtistFilters();
    initEPCarousel();
    updateArtistFilters();
    updateEPCarousel();

    let currentTeaserIndex = -1;
    let videoChangeTimeout = null;
    function changeTeaserVideo(newSrc) {
        if (!teaserVideo) return;
        if (teaserVideo.getAttribute('data-current-src') === newSrc) {
            teaserVideo.style.opacity = 1;
            teaserVideo.play().catch(e=>console.log(e));
            return;
        }
        
        teaserVideo.setAttribute('data-current-src', newSrc);
        teaserVideo.style.opacity = 0; // Fade out
        
        if (videoChangeTimeout) clearTimeout(videoChangeTimeout);
        
        videoChangeTimeout = setTimeout(() => {
            teaserVideo.src = newSrc;
            
            const onReady = () => {
                teaserVideo.style.opacity = 1;
                teaserVideo.removeEventListener('loadeddata', onReady);
            };
            teaserVideo.addEventListener('loadeddata', onReady);
            
            // Fallback just in case
            setTimeout(() => teaserVideo.style.opacity = 1, 500);

            teaserVideo.play().catch(e => {
                console.log("Autoplay prevented:", e);
                teaserVideo.style.opacity = 1;
            });

            // Update mini-player DOM
            const epIndex = db.findIndex(e => e.teaser === newSrc || (e.teasers && e.teasers.some(t => t.src === newSrc)));
            if (epIndex !== -1) {
                currentTeaserIndex = epIndex; // Keep track globally
                const ep = db[epIndex];
                const miniPlayerTrigger = document.getElementById("mini-player-trigger");
                const miniJacket = document.getElementById("mini-jacket");
                const miniTrack = document.getElementById("mini-track");
                const miniEp = document.getElementById("mini-ep");
                const miniLinkX = document.getElementById("mini-link-x");
                const miniLinkYt = document.getElementById("mini-link-yt");
                
                if (miniJacket) miniJacket.src = ep.jacket || '';
                if (miniTrack) miniTrack.innerText = ep.title;
                if (miniEp) miniEp.innerText = ep.artist;
                
                if (miniLinkX) {
                    if (ep.x) { miniLinkX.href = ep.x; miniLinkX.style.display = "inline-flex"; }
                    else { miniLinkX.style.display = "none"; }
                }
                if (miniLinkYt) {
                    if (ep.yt) { miniLinkYt.href = ep.yt; miniLinkYt.style.display = "inline-flex"; }
                    else { miniLinkYt.style.display = "none"; }
                }
            }
        }, 400); 
    }

    // Play random teaser
    function playNextRandomTeaser() {
        if (!teaserVideo) return;

        // Pick a random EP that is currently visible
        let activeNodes = epDOMNodes.filter(n => n.card.style.display !== "none");
        if (activeNodes.length === 0) return;
        
        // Prevent playing the same video twice in a row if possible
        if (activeNodes.length > 1 && currentTeaserIndex !== -1) {
            activeNodes = activeNodes.filter(n => epDOMNodes.indexOf(n) !== currentTeaserIndex);
        }

        // Only pick nodes that have a teaser
        const validNodes = activeNodes.filter(n => getEPTeaser(db[epDOMNodes.indexOf(n)]));
        if (validNodes.length === 0) return;

        const randomNode = validNodes[Math.floor(Math.random() * validNodes.length)];
        currentTeaserIndex = epDOMNodes.indexOf(randomNode);
        const ep = db[currentTeaserIndex];
        const chosenTeaser = getEPTeaser(ep);
        if (chosenTeaser) {
            changeTeaserVideo(chosenTeaser);
        }
    }

    if (teaserVideo) {
        teaserVideo.addEventListener("ended", () => {
            // EXPERIMENTAL: Always play the next random teaser when ended, regardless of mode!
            playNextRandomTeaser();
        });
    }

    // Initialize first teaser
    playNextRandomTeaser();

    // If no teaser video is loaded (e.g. no video files yet), initialize mini-player with the first EP info
    if (currentTeaserIndex === -1 && db.length > 0) {
        currentTeaserIndex = 0; // Default to the first EP
        const ep = db[0];
        const miniJacket = document.getElementById("mini-jacket");
        const miniTrack = document.getElementById("mini-track");
        const miniEp = document.getElementById("mini-ep");
        if (miniJacket) miniJacket.src = ep.jacket || '';
        if (miniTrack) miniTrack.innerText = ep.title;
        if (miniEp) miniEp.innerText = ep.artist;
    }



    function startInactivityTimeout() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            if (signageMode.classList.contains("active")) return;
            returnToSignage();
        }, 30000); // 30 seconds idle
    }

    function returnToSignage() {
        signageMode.classList.add("active");
        epSelectionMode.classList.remove("active");
        catalogMode.classList.remove("active");
        
        const miniPlayer = document.getElementById("mini-player");
        if (miniPlayer) {
            miniPlayer.classList.remove("active");
            miniPlayer.classList.remove("catalog-active");
        }
        
        jacketBgContainer.classList.remove("active");
        teaserVideo.style.opacity = 1;
        if (teaserVideo && teaserVideo.getAttribute("src")) {
            teaserVideo.play().catch(e => console.log(e));
        }
    }

    // Go to EP Selection
    function goToEPSelection() {
        if (signageMode) signageMode.classList.remove("active");
        if (catalogMode) catalogMode.classList.remove("active");
        if (epSelectionMode) epSelectionMode.classList.add("active");
        if (jacketBgContainer) jacketBgContainer.classList.remove("active"); 

        const miniPlayer = document.getElementById("mini-player");
        if (miniPlayer) {
            miniPlayer.classList.add("active");
            miniPlayer.classList.remove("catalog-active");
        }
        
        startInactivityTimeout(); 
    }

    // Select EP and load catalog info
    function selectEP(index) {
        startInactivityTimeout();
        
        currentEP = db[index];
        
        epSelectionMode.classList.remove("active");
        catalogMode.classList.add("active");
        
        const miniPlayer = document.getElementById("mini-player");
        if (miniPlayer) {
            miniPlayer.classList.add("active");
            miniPlayer.classList.add("catalog-active");
        }
        
        jacketBg.src = currentEP.jacket || '';
        jacketBgContainer.classList.add("active"); 
        
        const chosenTeaser = getEPTeaser(currentEP);
        if (chosenTeaser) {
            if (!teaserVideo || teaserVideo.getAttribute('data-current-src') !== chosenTeaser) {
                changeTeaserVideo(chosenTeaser);
            }
        }
        
        currentJacketImg.src = currentEP.jacket || '';
        epTitleDisplay.innerText = currentEP.title;
        epArtistDisplay.innerText = currentEP.artist;
        
        // Social Links
        const linkX = document.getElementById("link-x");
        const linkYt = document.getElementById("link-yt");
        const linkNico = document.getElementById("link-nico");
        
        if (currentEP.x) { linkX.href = currentEP.x; linkX.style.display = "inline-flex"; } else { linkX.style.display = "none"; }
        if (currentEP.yt) { linkYt.href = currentEP.yt; linkYt.style.display = "inline-flex"; } else { linkYt.style.display = "none"; }
        if (currentEP.nico) { linkNico.href = currentEP.nico; linkNico.style.display = "inline-flex"; } else { linkNico.style.display = "none"; }
        
        catalogPrice.innerText = currentEP.price || "¥1,000";
        if (currentEP.type === "merch") {
            catalogTracks.innerText = "グッズ";
        } else {
            catalogTracks.innerText = currentEP.tracks_count ? `${currentEP.tracks_count}曲入り` : "収録数未定";
        }
        catalogDesc.innerText = currentEP.description || "最新作！";

        const tracklistContainer = document.getElementById("catalog-tracklist");
        if (tracklistContainer) {
            tracklistContainer.innerHTML = "";
            if (currentEP.tracks && currentEP.tracks.length > 0) {
                currentEP.tracks.forEach((track, i) => {
                    const el = document.createElement("div");
                    el.className = "catalog-track-item";
                    el.innerText = `${i+1}. ${track.title}`;
                    tracklistContainer.appendChild(el);
                });
            } else if (currentEP.images && currentEP.images.length > 0) {
                currentEP.images.forEach((imgSrc) => {
                    const imgEl = document.createElement("img");
                    imgEl.src = imgSrc;
                    imgEl.className = "catalog-image-item";
                    imgEl.style.maxWidth = "100%";
                    imgEl.style.width = "auto";
                    imgEl.style.borderRadius = "12px";
                    imgEl.style.marginBottom = "15px";
                    imgEl.style.boxShadow = "0 10px 20px rgba(0,0,0,0.5)";
                    imgEl.style.cursor = "pointer";
                    imgEl.addEventListener("click", () => {
                        const modal = document.getElementById("image-modal");
                        const modalImg = document.getElementById("modal-img");
                        if (modal && modalImg) {
                            modalImg.src = imgSrc;
                            modal.classList.add("active");
                            startInactivityTimeout();
                        }
                    });
                    tracklistContainer.appendChild(imgEl);
                });
            }
        }
    }

    function exitSignageMode() {
        if (!signageMode.classList.contains("active")) return;
        goToEPSelection();
    }

    // Event Listeners (Attach to the whole mode to ensure it catches clicks anywhere)
    if (signageMode) signageMode.addEventListener("click", exitSignageMode);
    if (document.querySelector(".tap-wrapper")) document.querySelector(".tap-wrapper").addEventListener("click", exitSignageMode);
    
    document.getElementById("back-to-signage").addEventListener("click", returnToSignage);
    document.getElementById("back-to-ep").addEventListener("click", goToEPSelection);

    document.addEventListener("touchstart", () => {
        if (!signageMode.classList.contains("active")) startInactivityTimeout();
    }, {passive: true});

    document.addEventListener("mousemove", () => {
        if (!signageMode.classList.contains("active")) startInactivityTimeout();
    });

    // Image Modal Logic
    const imageModal = document.getElementById("image-modal");
    if (imageModal) {
        imageModal.addEventListener("click", () => {
            imageModal.classList.remove("active");
            startInactivityTimeout();
        });
    }

    // Volume Control Logic
    const volIconMute = document.getElementById("vol-icon-mute");
    const volIconUnmute = document.getElementById("vol-icon-unmute");
    const volSlider = document.getElementById("global-volume-slider");

    // Start completely muted and at volume 0
    let previousVolume = 0.5; // Default volume when unmuting for the first time
    teaserVideo.muted = true;
    teaserVideo.volume = 0;
    volSlider.value = 0;

    function updateVolumeUI(vol) {
        if (vol > 0) {
            volIconMute.style.display = "none";
            volIconUnmute.style.display = "block";
            teaserVideo.muted = false;
        } else {
            volIconMute.style.display = "block";
            volIconUnmute.style.display = "none";
            teaserVideo.muted = true;
        }
    }

    volSlider.addEventListener("input", (e) => {
        const vol = parseFloat(e.target.value);
        if (vol > 0) previousVolume = vol;
        teaserVideo.volume = vol;
        updateVolumeUI(vol);
        startInactivityTimeout();
    });

    volIconMute.addEventListener("click", () => {
        // Unmuting
        const targetVol = Math.max(0.05, previousVolume);
        volSlider.value = targetVol;
        teaserVideo.volume = targetVol;
        updateVolumeUI(targetVol);
        startInactivityTimeout();
    });

    function muteAudio() {
        if (teaserVideo.volume > 0) previousVolume = teaserVideo.volume;
        volSlider.value = 0;
        teaserVideo.volume = 0;
        updateVolumeUI(0);
    }

    volIconUnmute.addEventListener("click", () => {
        // Muting
        muteAudio();
        startInactivityTimeout();
    });

    // Mute audio when clicking social links
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            muteAudio();
        });
    });

    // Mini Player Interaction (Trigger area only, to avoid volume slider)
    const miniPlayerTrigger = document.getElementById("mini-player-trigger");
    if (miniPlayerTrigger) {
        miniPlayerTrigger.addEventListener("click", () => {
            if (currentTeaserIndex !== null && currentTeaserIndex >= 0 && currentTeaserIndex < db.length) {
                selectEP(currentTeaserIndex);
            }
        });
    }

    // Intercept Media Keys to prevent pausing the background teaser
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('pause', () => {
            // Force resume
            if (teaserVideo) teaserVideo.play().catch(e => console.log(e));
            // Toggle Mute
            if (teaserVideo.muted || teaserVideo.volume === 0) {
                const targetVol = Math.max(0.05, previousVolume);
                volSlider.value = targetVol;
                teaserVideo.volume = targetVol;
                updateVolumeUI(targetVol);
            } else {
                previousVolume = teaserVideo.volume;
                volSlider.value = 0;
                teaserVideo.volume = 0;
                updateVolumeUI(0);
            }
        });
        navigator.mediaSession.setActionHandler('play', () => {
            if (teaserVideo) teaserVideo.play().catch(e => console.log(e));
        });
    }

    if (teaserVideo && teaserVideo.getAttribute("src")) {
        teaserVideo.play().catch(e => console.log("Video autoplay blocked:", e));
    }
});
