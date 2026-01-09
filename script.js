
(function() {
    let settings = getSettings();
    function getSettings() {
        try {
            fetch(`http://localhost:2007/get_handle?name=BetterAlbumInfo`).then(response => {
                if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
    
                response.json().then(d => {
                    const { data } = d
                    if (data?.sections) {
                        settings = transformJSON(data);
                    }
                });
                
            });
            return null;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    function transformJSON(data) {
        const result = {};
        try {
            data.sections.forEach(section => {
                section.items.forEach(item => {
                    if (item.type === "text" && item.buttons) {
                        result[item.id] = {};
                        item.buttons.forEach(button => {
                            result[item.id][button.id] = {
                                value: button.text,
                                default: button.defaultParameter
                            };
                        });
                    } else {
                        result[item.id] = {
                            value: item.bool || item.input || item.selected || item.value || item.filePath,
                            default: item.defaultParameter
                        };
                    }
                });
            });
        } finally {
            return result;
        }
    }

    function getSetting(name, withEntityType = true) {
        if (!settings) return true;

        const setting = (withEntityType ? lastEntity.type + "_" : "") + name
        return settings[setting].value
    }

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

    function hookMethod(moduleNum, methodName, hook, c = undefined) {
        try {
            const moduleContainer = appRequire(moduleNum); 
            
            if (!moduleContainer) {
                console.error("Failed to get module")
            }
            
            if (!c) {
                c = Object.keys(moduleContainer)[0]
            }

            if (!moduleContainer[c]) {
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

    hookMethod(ALBUM_GETTER, "getAlbumWithTracksIds", afterGotEntity)
    hookMethod(ALBUM_GETTER, "getAlbumWithRichTracks", afterGotEntity)
    hookMethod(PLAYLIST_GETTER, "getPlaylist", afterGotEntity)
    hookMethod(ARTIST_GETTER, "getInfo", afterGotEntity)

    let lastEntity = null

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
        "rnb": {g:"R&B", s:"m"},
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

    const numSuffixes = new Map([
        ["one", ""],
        ["two", "а"],
        ["few", "а"],
        ["many", "ов"],
        ["other", "ов"],
        ]);

    const pluralFormatter = new Intl.PluralRules('ru-RU')

    function getPluralTrackString(num) {
        const rule = pluralFormatter.select(num);
        const suffix = numSuffixes.get(rule);
        return `${num} трек${suffix}`;
    }

    function getLocalizatedDate(date) {
        if (!(date instanceof Date)) {
            date = new Date(date)
        }

        return date.toLocaleDateString('ru-RU',{
                day: 'numeric',
                month: 'long',   
                year:  date.getFullYear() == new Date(Date.now()).getFullYear() ? undefined : 'numeric',
            })
    }

    const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                const node = mutation.target
                if (node instanceof HTMLElement && getSetting('playlist_index', false)) {
                    const trackNodes = node.querySelectorAll?.('div[data-index] > div[data-test-id="TRACK_PLAYLIST"]:not(:has(div.PlayButtonWithPosition_position__wk3OT))')
                    trackNodes.forEach(node => {
                        const position = node.parentElement.getAttribute("data-index")
                        const positionNode = document.createElement('div')
                        positionNode.style = "padding-right: var(--ym-spacer-size-xs)"
                        positionNode.classList.add("_MWOVuZRvUQdXKTMcOPx", "Z_WIr2W8JU4MPQek3hgR", "ZYV27jeWd30QDXu4GhaH", "PlayButtonWithPosition_position__wk3OT")
                        positionNode.textContent = position
                        node.insertBefore(positionNode, node.firstChild)
                    })
                }

                if (
                    mutation.type === "childList" && lastEntity
                ) {
                    mutation.addedNodes.forEach((node) => {
                        if (!(node instanceof HTMLElement)) return;

                        const type = lastEntity.type
                        const entity = lastEntity.entity

                        if (type === "album") {
                            const releaseDateNode = node.querySelector?.(
                                '[data-test-id="ALBUM_RELEASE_DATE"]')
                            if (
                                releaseDateNode
                            ) {
                                let genreNode;
                                if (entity.genre && getSetting("genre")) {
                                    genreNode = releaseDateNode.cloneNode(true)
                                    genreNode.textContent = "Жанр: " + getLocalizatedGenre(entity.genre)
                                }

                                if (entity.releaseDate && getSetting("date")) {
                                    releaseDateNode.textContent = getLocalizatedDate(entity.releaseDate)
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

                                if (genreNode) {
                                    releaseDateNode.parentElement.append(genreNode)
                                }

                                if (entity.id && getSetting("id")) {
                                    const idNode = releaseDateNode.cloneNode(true)
                                    idNode.textContent = "ID: " + entity.id
                                    releaseDateNode.parentElement.append(idNode)
                                }

                                if (entity.trackCount && getSetting("trackCount")) {
                                    const countNode = releaseDateNode.cloneNode(true)
                                    countNode.textContent = getPluralTrackString(entity.trackCount)
                                    releaseDateNode.parentElement.append(countNode)
                                }
                            }
                        }
                        else if (type === "playlist") {
                            if (entity.visibility == "private" && getSetting("private")) {    
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

                                if (entity.created && getSetting("created")) {
                                    subtitleNode.textContent += " / создано " + getLocalizatedDate(entity.created)
                                }

                                if (entity.durationMs && entity.trackCount && getSetting("trackCount")) {
                                    const durationNode = subtitleNode.cloneNode(true)
                                    durationNode.style = null
                                    durationNode.classList.remove("oyQL2RSmoNbNQf3Vc6YI")

                                    const formatter = new Intl.DurationFormat('ru-RU', {style: "long"})
                                    const seconds = Math.floor(entity.durationMs / 1000)
                                    const duration = {
                                        hours: Math.floor(seconds / 3600),
                                        minutes: Math.floor((seconds % 3600) / 60),
                                        seconds: seconds % 60
                                        };
                                    const durationStr = formatter.format(duration)

                                    durationNode.textContent = getPluralTrackString(entity.trackCount) + " (" + durationStr + ")"
                                    durationNode.classList.add("PageHeaderAlbumMeta_year_dot__TrSFr")
                                    subtitleNode.parentElement.append(durationNode)
                                }
                            }
                        }
                        else if (type === "artist") {
                            if (entity.stats?.lastMonthListenersDelta && entity.stats?.lastMonthListenersDelta != 0 && getSetting("delta")) {
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