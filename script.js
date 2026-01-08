
(function() {
    const webpackGlobal = window.webpackChunk_N_E;
    let appRequire = null;

    webpackGlobal.push([
        [Symbol("requireGetter__BetterAlbumInfo")],
        {},
        (internalRequire) => {
            appRequire = internalRequire;
        }
    ]);
    webpackGlobal.pop();

    if (!appRequire) {
        console.error("Failed to get appRequire func");
        return;
    }

    function hookMethod(moduleNum, c, methodName, hook) {
        try {
            const moduleContainer = appRequire(moduleNum); 
            
            if (!moduleContainer || !moduleContainer[c]) {
                console.error("Failed to find target class.");
                return;
            }

            const cls = moduleContainer[c];

            if (!cls.prototype[methodName]) {
                console.error(`Failed to find method ` + methodName + `.`);
                return;
            }

            const originalMethod = cls.prototype[methodName];

            cls.prototype[methodName] = async function(...args) {
                const result = await originalMethod.apply(this, args);

                try {
                    hook(this, originalMethod, result, ...args)
                } catch (error) {
                    console.error(error)
                }

                return result;
            };

        } catch (e) {
            console.error("Fail ", e);
        }
    }

    const ALBUM_GETTER = 93650;
    const PLAYLIST_GETTER = 63554;
    const ARTIST_GETTER = 2512;

    hookMethod(ALBUM_GETTER, "B", "getAlbumWithTracksIds", afterGotEntity)
    hookMethod(ALBUM_GETTER, "B", "getAlbumWithRichTracks", afterGotEntity)
    hookMethod(PLAYLIST_GETTER, "T", "getPlaylist", afterGotEntity)
    hookMethod(ARTIST_GETTER, "b", "getInfo", afterGotEntity)

    let lastEntity = null

    /**
     * @param {*} t 
     * @param {function} method 
     * @param {*} result 
     * @param  {...any} args 
     */
    function afterGotEntity(t, method, result, ...args) {
        lastEntity = {
            "type": method?.name?.includes("Album") ? "album" : method?.name?.includes("Playlist") ? "playlist" : "artist",
            "entity": result
        }
        //console.log(lastEntity)
    }

    const genres = {
        "rap": {g: "Рэп", s: "m"},
        "rock": {g: "Рок", s: "m"},
        "electronics": {g: "Электроника", s: "w"},
        "pop": {g:"Поп", s:"m"},
        "kpop": {g:"K-Пoп", s:"m"},
        "hyperpopgenre": {g:"Гиперпoп", s:"m"},
        "indie": {g:"Инди", s:"m"},
        "alternative": {g:"Альтернатив", s:"m"},
        "edmgenre": {g:"EDM", s:"m"},
        "dance": {g:"Танцевальная Музыка", s:"w"},
        "mb": {g:"R&B", s:"m"},
        "techno": {g:"Техно", s:"m"},
        "disco": {g:"Диско", s:"m"},
        "house": {g:"Хаус", s:"m"},
        "breakbeatgenre": {g:"Брейкбит", s:"m"},
        "funk": {g:"Фанк", s:"m"},
        "dub": {g:"Даб", s:"m"},
        "soundtrack": {g:"Саундтрек", s:"m"},
        "films": {g:"Музыка к фильму", s:"w"},
        "punk": {g:"Панк", s:"m"},
        "industrial": {g:"Индастриал", s:"m"},
        "triphopgenre": {g:"Трипхоп", s:"m"},
        "newwave": {g:"Новая волна", s:"w"},
        "bassgenre": {g:"Басс", s:"m"},
        "soul": {g:"Соул", s:"m"},
        "stonerrock": {g:"Стоунер-рок", s:"m"},
        "animated": {g:"Анимация", s:"w"},
    }

    const suffixes = {
        "rus_m": "Русский",
        "rus_w": "Русская",
        "local-_m": "Местный",
        "local-_w": "Местная",
        "foreign_m": "Иностранный",
        "foreign_w": "Иностранная"
    }

    /**
     * @param {string} genre 
     * @returns {string}
     */
    function getLocalizatedGenre(genre) {
        if (genres[genre]) {
            return genres[genre].g;
        }

        const suffixKeys = Object.keys(suffixes);
        const prefixes = [...new Set(suffixKeys.map(x => x.split('_')[0]))];

        for (const prefix of prefixes) {
            if (genre.startsWith(prefix)) {
                const cleanGenreKey = genre.slice(prefix.length);

                if (genres[cleanGenreKey]) {
                    const genreData = genres[cleanGenreKey];
                    
                    const suffixKey = `${prefix}_${genreData.s}`;
                    
                    if (suffixes[suffixKey]) {
                        return `${suffixes[suffixKey]} ${genreData.g}`;
                    }
                }
            }
        }

        return genre;
    }

    const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (
                    mutation.type === "childList"
                ) {
                    mutation.addedNodes.forEach((node) => {
                        if (!(node instanceof HTMLElement && lastEntity)) return;

                        const type = lastEntity.type
                        const entity = lastEntity.entity
                        if (type === "album") {
                            if (entity.releaseDate || entity.genre || entity.id) {
                                const releaseDateNode = node.querySelector?.(
                                    '[data-test-id="ALBUM_RELEASE_DATE"]')
                                if (
                                    releaseDateNode
                                ) {
                                    let genreNode;
                                    if (entity.genre) {
                                        genreNode = releaseDateNode.cloneNode(true)
                                        genreNode.textContent = "Жанр: " + getLocalizatedGenre(entity.genre)
                                    }

                                    if (entity.releaseDate) {
                                        releaseDateNode.textContent = new Date(entity.releaseDate).toLocaleDateString('default',{
                                            day: '2-digit',
                                            month: 'long',   
                                            year: 'numeric',
                                        })
                                        if (entity.recent) {
                                            const container = document.createElement("div")
                                            container.innerHTML = 
                                                `<svg 
                                                    class="Chart_progress__sGj4s Chart_progress_crown__o__Zm l3tE1hAMmBj2aoPPwU08" 
                                                    focusable="false" 
                                                    style="
                                                        scale: 2;
                                                        padding-left: 5px;
                                                    "
                                                    aria-hidden="false">
                                                        <use xlink:href="/icons/sprite.svg#chartNew_xxs">
                                                        </use>
                                                </svg>`
                                            releaseDateNode.appendChild(container.firstChild)
                                        }
                                    }

                                    if (entity.genre) {
                                        releaseDateNode.parentElement.append(genreNode)
                                    }

                                    if (entity.id) {
                                        const idNode = releaseDateNode.cloneNode(true)
                                        idNode.textContent = "ID: " + entity.id
                                        releaseDateNode.parentElement.append(idNode)
                                    }

                                    if (entity.trackCount) {
                                        const countNode = releaseDateNode.cloneNode(true)
                                        countNode.textContent = entity.trackCount + " треков"
                                        releaseDateNode.parentElement.append(countNode)
                                    }
                                }
                            }
                        }
                        else if (type === "playlist") {
                            if (entity.visibility == "private") {    
                                let title = node.querySelector?.(
                                        '[data-test-id="ENTITY_TITLE"]')
                                if (title) {
                                    parent = title.parentElement
                                    parent.style = "display: flex; align-items: center;"

                                    const container = document.createElement("div")
                                    container.innerHTML = 
                                        `<svg 
                                        class="CommonControlsBar_ugcIcon__OV0Cl l3tE1hAMmBj2aoPPwU08" 
                                        focusable="false" 
                                        aria-label="Этот плейлист можете слушать только вы" 
                                        data-test-id="UGC_PLAYLIST_ICON" 
                                        aria-hidden="false">
                                            <use xlink:href="/icons/sprite.svg#eye_crossed_xxs">
                                            </use>
                                        </svg>`
                                    parent.appendChild(container.firstChild)
                                }
                            }

                            let subtitleNode = node.querySelector?.(
                                    '[data-test-id="PLAYLIST_HEADER_UPDATED_TEXT"]')
                            if (subtitleNode) {
                                subtitleNode.innerHTML = `<div>${subtitleNode.innerHTML}</div>`
                                subtitleNode = subtitleNode.firstChild

                                if (entity.created) {
                                    subtitleNode.textContent += " / создано " + new Date(entity.created).toLocaleDateString('default',{
                                                day: 'numeric',
                                                month: 'long',   
                                                year: 'numeric'
                                            })
                                }

                                if (entity.durationMs) {
                                    const durationNode = subtitleNode.cloneNode(true)
                                    durationNode.style = null
                                    durationNode.classList.remove("oyQL2RSmoNbNQf3Vc6YI")

                                    const formatter = new Intl.DurationFormat('default', {style: "long"})
                                    const seconds = Math.floor(entity.durationMs / 1000)
                                    const duration = {
                                        hours: Math.floor(seconds / 3600),
                                        minutes: Math.floor((seconds % 3600) / 60),
                                        seconds: seconds % 60
                                        };
                                    const durationStr = formatter.format(duration)

                                    durationNode.textContent = entity.tracks.length + " треков (" + durationStr + ")"
                                    durationNode.classList.add("PageHeaderAlbumMeta_year_dot__TrSFr")
                                    subtitleNode.parentElement.append(durationNode)
                                }
                            }
                        }
                        else if (type === "artist") {
                            if (entity.stats?.lastMonthListenersDelta && entity.stats?.lastMonthListenersDelta != 0) {
                                const monthListenersNode = node.querySelector?.(
                                        '[data-test-id="ARTIST_LISTENERS_COUNT"]')
                                if (monthListenersNode) {
                                    const delta = entity.stats.lastMonthListenersDelta
                                    const deltaNode = document.createElement('span')
                                    deltaNode.classList = ["g3qWNP6xl__7qxNmtrvd", "_3_Mxw7Si7j2g4kWjlpR"]
                                    let color = "f84d33";
                                    if (delta > 0) {
                                        deltaNode.textContent = "+"
                                        color = "4fca64"
                                    }

                                    deltaNode.style = "color: #" + color + "; opacity: 75%;"
                                    deltaNode.textContent += delta.toLocaleString() + " за последние 28 дней"
                                    monthListenersNode.parentElement.appendChild(deltaNode)
                                }
                            }
                        }
                    });
                }
            }
        });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
})();