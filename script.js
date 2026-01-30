
(function() {

    let _aiArtistsCache = { }
    async function isAi(artistId) {
        let result = _aiArtistsCache[artistId]
        if (result !== null && result !== undefined) {
            return _aiArtistsCache[artistId]
        }
        result = (await fetch('https://iimuzyka.top/' + artistId.toString(), {
            redirect: 'manual'
        })).ok
        _aiArtistsCache[artistId] = result
        return result 
    }

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

    function getModuleClass(moduleNum, c = undefined) {
        const moduleContainer = appRequire(moduleNum); 
            
        if (!moduleContainer) {
            console.error("Failed to get module")
            return null;
        }
        
        if (!c) {
            c = Object.keys(moduleContainer)[0]
        }

        if (!moduleContainer[c]) {
            console.error("Failed to find target class.");
            return null;
        }

        return moduleContainer[c]
    }

    function hookMethod(moduleNum, methodName, hook, c = undefined) {
        try {
            const cls = getModuleClass(moduleNum, c)

            if (!cls?.prototype[methodName]) {
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
    hookMethod(ARTIST_GETTER, "getInfo", afterGotArtistInfo)
    hookMethod(ARTIST_GETTER, "getBriefInfo", afterGotBriefArtistInfo)

    let lastEntity = null

    let _cachedBriefArtistInfos = {}
    function afterGotBriefArtistInfo(t, method, result, ...args) {
        _cachedBriefArtistInfos[result.artist.id.toString()] = result
        if (lastEntity?.entity?.artist?.id == result?.artist?.id) {
            afterAfterGotArtistAnyInfo(t, method, result, ...args)
        }
        else {
            console.debug(result)
        }
    }

    function afterGotArtistInfo(t, method, result, ...args) {
        const cached = _cachedBriefArtistInfos[result.artist.id.toString()]
        if (cached) {
            result = cached
        }

        afterAfterGotArtistAnyInfo(t, method, result, ...args)

        if (!cached && getSetting("brief") && (getSetting("albums") || getSetting("date") || getSetting("genres") || getSetting("tracks"))) {
            t.getBriefInfo(...args)
        }
    }

    function afterAfterGotArtistAnyInfo(t, method, result, ...args) {
        afterGotEntity(t, method, result, ...args)
        handleArtist(result, document)
    }

    function afterGotEntity(t, method, result, ...args) {
        lastEntity = {
            "type":
                method?.name?.includes("Album") ? "album" : 
                method?.name?.includes("Playlist") ? "playlist" : 
                "artist",
            "entity": result
        }
        console.debug(lastEntity)
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
        "rnb": {g:"R&B (Ритм-н-блюз)", s:"m"},
        "techno": {g:"Техно", s:"m"},
        "disco": {g:"Диско", s:"m"},
        "house": {g:"Хаус", s:"m"},
        "breakbeatgenre": {g:"Брейкбит", s:"m"},
        "funk": {g:"Фанк", s:"m"},
        "dub": {g:"Даб", s:"m"},
        "dnb": {g:"D&B (Драм-н-бейс)", s:"m"},
        "soundtrack": {g:"Саундтрек", s:"m"},
        "films": {g:"Музыка к фильму", s:"w"},
        "tvseries": {g:"Музыка к сериалу", s:"w"},
        "punk": {g:"Панк", s:"m"},
        "industrial": {g:"Индастриал", s:"m"},
        "triphopgenre": {g:"Трипхоп", s:"m"},
        "newwave": {g:"Новая волна", s:"w"},
        "bassgenre": {g:"Басс", s:"m"},
        "soul": {g:"Соул", s:"m"},
        "stonerrock": {g:"Стоунер-рок", s:"m"},
        "animated": {g:"Анимация", s:"w"},
        "children": {g:"Музыка для детей", s:"w"},
        "metal": {g:"Метал", s:"m"},
        "numetal": {g:"Ню-метал", s:"m"},
        "holiday": {g:"Праздничная музыка", s:"w"},
        "phonkgenre": {g:"Фонк", s:"m"},
        "folk": {g:"Фолк", s:"m"},
    }

    const suffixes = {
        "rus_m": "Русский",
        "rus_w": "Русская",
        "local-_m": "Местный",
        "local-_w": "Местная",
        "foreign_m": "Иностранный",
        "foreign_w": "Иностранная",
        "classic_m": "Классический",
        "classic_w": "Классическая",
        "latin_m": "Латинский",
        "latin_w": "Латинская",
        "african_m": "Африканский",
        "african_w": "Африканская",
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

    function getPluralString(num, prefix) {
        const rule = pluralFormatter.select(num);
        const suffix = numSuffixes.get(rule);
        return `${num} ${prefix}${suffix}`;
    }

    function getPluralTrackString(num) {
        return getPluralString(num, "трек")
    }

    function getPluralAlbumString(num) {
        return getPluralString(num, "альбом")
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
                    const trackNodes = node.querySelectorAll?.('div[data-index] > .PlaylistPageDnDItemWrapper_inner__UXQZf > div[data-test-id="TRACK_PLAYLIST"], div[data-index] > div[data-test-id="TRACK_PLAYLIST"]')
                    trackNodes.forEach(node => {
                        var positionNode = node.querySelector('.PlayButtonWithPosition_position__wk3OT')
                        const parent = node.closest('div[data-index]')
                        const index = parent.getAttribute("data-index")
                        const position = parseInt(index) + 1
                        if (isNaN(position)) return;
                        if (!positionNode) {
                            positionNode = document.createElement('div')
                            positionNode.classList.add("_MWOVuZRvUQdXKTMcOPx", "Z_WIr2W8JU4MPQek3hgR", "ZYV27jeWd30QDXu4GhaH", "PlayButtonWithPosition_position__wk3OT", "PositionIndex")
                            node.insertBefore(positionNode, node.firstChild)
                            const dragAndDrop = node.querySelector('.DragAndDropIcon_root__OstQU')
                            if (dragAndDrop) {
                                dragAndDrop.classList.add("DragAndDrop_positionIndex")
                                positionNode.classList.add("PositionIndex_dragAndDrop")
                            }
                        }
                        positionNode.textContent = position.toLocaleString()
                    })
                }

                if (
                    mutation.type === "childList" && lastEntity
                ) {
                    mutation.addedNodes.forEach(async (node) => {
                        if (!(node instanceof HTMLElement)) return;

                        const type = lastEntity.type
                        const entity = lastEntity.entity

                        if (type === "album") {
                            await addAiBadge(node, entity.artists.map(x => x.id))
                            const releaseDateNode = node.querySelector?.(
                                '[data-test-id="ALBUM_RELEASE_DATE"]')
                            if (
                                releaseDateNode
                            ) {
                                let genreNode;
                                if (entity.genre && getSetting("genre")) {
                                    genreNode = releaseDateNode.cloneNode(true)
                                    genreNode.textContent = getLocalizatedGenre(entity.genre)
                                }

                                if (entity.releaseDate && getSetting("date")) {
                                    const date = new Date(entity.releaseDate)
                                    const now = new Date(Date.now())
                                    releaseDateNode.textContent = getLocalizatedDate(date)
                                    if ((now - date)/1000/60/60/24/30 < (entity.recent ? 3 : 1)) {
                                        const container = document.createElement("div")
                                        container.innerHTML = 
                                            `<svg 
                                                class="Chart_progress__sGj4s Chart_progress_crown__o__Zm l3tE1hAMmBj2aoPPwU08 RecentAlbumIcon" 
                                                focusable="false" 
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
                                    const parent = title.parentElement
                                    parent.classList.add("titleContainer")

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

                                if (entity.owner && entity.lastOwnerPlaylists && entity.lastOwnerPlaylists.length > 0 && getSetting("moreOwner")) {
                                    subtitleNode.textContent = subtitleNode.textContent.replace(RegExp(`^((${entity.owner.name})|(${entity.owner.login}))`), " ")
                                    subtitleNode.innerHTML = "&nbsp;" + subtitleNode.innerHTML

                                    const container = document.createElement("div")
                                    container.innerHTML = `<button 
                                        class=
                                        type="button" >
                                        </button>`
                                    const button = document.createElement("button")
                                    button.classList.add("cpeagBA1_PblpJn8Xgtv", "qlPp6CSQQEMVZPqtqLiQ", "dgV08FKVLZKFsucuiryn", "IlG7b1K0AD7E7AMx6F5p", "IgYbZLnYjW0nMahgpkus", "qU2apWBO1yyEK0lZ3lPO")
                                    button.type = "button"
                                    button.style.overflow = "unset"

                                    function onClick(entity) {
                                        const overlay = document.createElement('div');
                                        overlay.id = 'BetterAlbumInfo_modal';
                                        overlay.classList.add("MorePlaylistsFromUserModal", "ifxS_8bgSnwBoCsyow0E", "t7tk8IYH3tGrhDZJpi3Z", "GKgBufCxWa9erUCTU3Fp")

                                        const modal = document.createElement('div');
                                        modal.classList.add("MorePlaylistsFromUserModal_modal", "ifxS_8bgSnwBoCsyow0E")

                                        const header = document.createElement('div');
                                        header.innerText = "Еще плейлисты от " + entity.owner.name;
                                        header.style.marginBottom = "20px";
                                        header.style.fontSize = "20px";
                                        header.style.fontWeight = "bold";

                                        const content = document.createElement('div');
                                        const contentContent = document.createElement('div')

                                        const albumList = document.createElement("ol")
                                        albumList.classList.add("IZnFMW4gXBshJODnvB1P", "SkeletonBlock_container__9IxUi")

                                        entity.lastOwnerPlaylists.forEach(playlist => {
                                            const container = document.createElement('li')
                                            container.classList.add("VJ9IexhAEuYSCyGiMfN4")
                                            container.innerHTML = `<div
                                                                    class="laBJlJAaqEVS0i_4Ot3l PlaylistCard_root__i3pR4"
                                                                    >
                                                                    <div>
                                                                        <a
                                                                        href="/playlists?playlistUuid=${playlist.playlistUuid}"
                                                                        >
                                                                            <div
                                                                            class="qaIScXjx1qyXuaIHXQIo _7gw1qGE6BeUAdSMbhRx ZcpulvHgF_wsgzB8Hye9 gtfPudKIIbfkwmuOBzwI PlaylistCard_cover__tpK5L"
                                                                            >
                                                                                <div class="PlaylistCard_coverBlock__1slsN">
                                                                                    <img
                                                                                    class="qQ7GQU14EkggPBC6jdeS fosYvyLDok3Kjj9OWmxG PlaylistCard_image__Li6oy"
                                                                                    alt="Плейлист ${playlist.title}"
                                                                                    loading="eager"
                                                                                    aria-hidden="true"
                                                                                    data-test-id="ENTITY_COVER_IMAGE"
                                                                                    srcset="
                                                                                        https://${playlist.ogImage.replace("%%", "200x200")},
                                                                                        https://${playlist.ogImage.replace("%%", "400x400")} 2x
                                                                                    "
                                                                                    src="https://${playlist.ogImage.replace("%%", "200x200")}"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </a>
                                                                    </div>
                                                                    <div class="IO4kvpDGNI2J0CHwcKSf">
                                                                        <div class="l8SktNpJd30JWp1owp_b Mb33JzAWx9EjbQAeScFt" style="min-height: var(--ym-font-line-height-label-m)">
                                                                        <div class="LmhA6nlLyzxwYIX31gYa">
                                                                            <div
                                                                            class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 mxSPe5xpZnie9gpIqacd _3_Mxw7Si7j2g4kWjlpR FAmeEGy52GX1k0xZuPDn"
                                                                            style="-webkit-line-clamp: 2; margin-bottom: 5px"
                                                                            >
                                                                                <div
                                                                                    class="_MWOVuZRvUQdXKTMcOPx LezmJlldtbHWqU7l1950 jMyoZB5J9iZbzJmWOrF0 mxSPe5xpZnie9gpIqacd _3_Mxw7Si7j2g4kWjlpR"
                                                                                    data-test-id="PLAYLIST_TITLE"
                                                                                    style="-webkit-line-clamp: 2"
                                                                                >
                                                                                    <a
                                                                                    target="_self"
                                                                                    rel=""
                                                                                    class="buOTZq_TKQOVyjMLrXvB PlaylistCard_titleLink__H8qEc"
                                                                                    href="/playlists?playlistUuid=${playlist.playlistUuid}"
                                                                                    >${playlist.title}</a
                                                                                    >
                                                                                </div>
                                                                                <div class="IgYbZLnYjW0nMahgpkus">
                                                                                ${getPluralTrackString(playlist.trackCount)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        </div>
                                                                    </div>
                                                                    </div>`
                                            albumList.appendChild(container)
                                        })
                                        content.appendChild(albumList)

                                        const btn = document.createElement('button');
                                        btn.classList.add("MorePlaylistsFromUserModal_button")
                                        btn.innerText = "Закрыть";
                                    
                                        btn.onclick = () => overlay.remove();

                                        content.appendChild(contentContent)
                                        content.appendChild(btn);
                                        modal.appendChild(header);
                                        modal.appendChild(content);
                                        overlay.appendChild(modal);
                                        document.body.appendChild(overlay);

                                        overlay.onclick = (e) => {
                                            if (e.target === overlay) overlay.remove();
                                        };
                                    }
                                    button.addEventListener("click", (_, e = entity) => onClick(e))
                                    const span = document.createElement('span')
                                    span.classList.add("_MWOVuZRvUQdXKTMcOPx", "g3qWNP6xl__7qxNmtrvd", "_3_Mxw7Si7j2g4kWjlpR")
                                    span.textContent = entity.owner.name
                                    button.appendChild(span)
                                    subtitleNode.parentElement.insertBefore(button, subtitleNode.parentElement.firstChild)
                                }

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
                            handleArtist(entity, node)
                        }
                });
            }
            }
        });

    async function addAiBadge(node, artistsIds) {
        if (!getSetting("artist_ai", false)) return
        if (!Array.isArray(artistsIds)) {
            artistsIds = [artistsIds]
        }
        
        const promises = artistsIds.map(id => isAi(id));
        const results = await Promise.all(promises);
        const isAiGenerated = results.some(result => result === true);
        if (!isAiGenerated) return
        
        container = node.querySelector(".PageHeaderTitle_stickyTitle__CL1m4:is(:not(:has(.aiGeneratedIcon)) :not(.aiGeneratedContainer))")
        if (!container) return
        container.classList.add("titleContainer")
        const cntr = document.createElement('div')
        cntr.classList.add("aiGeneratedContainer")
        const span = document.createElement("span")
        span.textContent = "Сгенерировано ИИ"
        const badge = document.createElement("div")
        badge.innerHTML = `<svg 
                            class="CommonControlsBar_ugcIcon__OV0Cl l3tE1hAMmBj2aoPPwU08 aiGeneratedIcon" 
                            focusable="false" 
                            aria-label="Сгенерировано ИИ" 
                            aria-hidden="false" 
                            xmlns="http://www.w3.org/2000/svg" 
                            version="1.1" 
                            xmlns:xlink="http://www.w3.org/1999/xlink" 
                            width="512" 
                            height="512" 
                            x="0" 
                            y="0" 
                            viewBox="0 0 512 512">
                                <g>
                                    <path d="M440.123 317.331c12.299-14.459 19.745-33.169 19.745-53.594 0-40.92-29.829-74.984-68.88-81.644a61.11 61.11 0 0 0 9.451-32.698c0-65.985-53.683-119.667-119.667-119.667h-5.511c-8.284 0-15 6.716-15 15 0 23.804-19.366 43.17-43.17 43.17H173.06c-33.91 0-61.497 27.587-61.497 61.497a61.11 61.11 0 0 0 9.451 32.698c-39.051 6.661-68.88 40.725-68.88 81.645 0 20.425 7.445 39.135 19.744 53.594C31.365 322.717 0 357.467 0 399.428c0 45.681 37.164 82.845 82.845 82.845h346.31c45.681 0 82.845-37.165 82.845-82.846 0-41.96-31.365-76.71-71.877-82.096zM173.059 117.897h44.031c35.086 0 64.483-24.821 71.552-57.828 45.77 4 81.796 42.535 81.796 89.325 0 17.368-14.129 31.497-31.497 31.497H173.059c-17.368 0-31.497-14.129-31.497-31.497s14.129-31.497 31.497-31.497zm-38.081 92.995h242.045c29.139 0 52.845 23.707 52.845 52.846s-23.706 52.845-52.845 52.845H134.978c-29.139 0-52.845-23.707-52.845-52.846s23.705-52.845 52.845-52.845zm294.177 241.381H82.845C53.707 452.273 30 428.566 30 399.427s23.707-52.845 52.845-52.845h346.31c29.139 0 52.845 23.706 52.845 52.845s-23.707 52.846-52.845 52.846z">
                                    </path>
                                </g>
                            </svg>`
        
        cntr.appendChild(badge.firstChild)
        cntr.appendChild(span)
        container.appendChild(cntr)
    }
    
    async function handleArtist(entity, node) {
        const artist = entity.artist
        await addAiBadge(node, artist.id)
        const stats = entity.stats || artist.stats
        if (stats?.lastMonthListenersDelta && stats?.lastMonthListenersDelta != 0 && getSetting("delta")) {
            const monthListenersNode = node.querySelector?.(
                    '[data-test-id="ARTIST_LISTENERS_COUNT"]')
            if (monthListenersNode && !node.querySelector('.DeltaListeners')) {
                const delta = entity.stats.lastMonthListenersDelta
                const deltaNode = document.createElement('span')
                deltaNode.classList.add("g3qWNP6xl__7qxNmtrvd", "_3_Mxw7Si7j2g4kWjlpR", "DeltaListeners")
                if (delta > 0) {
                    deltaNode.textContent = "+"
                    deltaNode.classList.add("PositiveDeltaListeners")
                }
                else {
                    deltaNode.classList.add("NegativeDeltaListeners")
                }
                deltaNode.textContent += delta.toLocaleString() + " за последние 28 дней"
                monthListenersNode.parentElement.appendChild(deltaNode)
            }
        }

        const likes = entity.likesCount || entity.artist.likesCount
        if (likes && likes != 0 && getSetting("likes")) {
            const button = node.querySelector('.PageHeaderArtist_controls__U_6g7 [data-test-id="LIKE_BUTTON"]:not(:has(span._3_Mxw7Si7j2g4kWjlpR))')
            if (button) {
                button.style = "display: flex; align-items: center; padding-inline-end: var(--ym-spacer-size-xl); padding-inline-start: var(--ym-spacer-size-xl);" // приходиться использовать стили вместо классов т.к ям слишком часто обнуляет кастомные классы
                const span = button.querySelector("span.JjlbHZ4FaP9EAcR_1DxF")
                const liked = button.ariaPressed === "true"

                let likesNode;
                function updateButton(likes) {
                    if (likesNode) {
                        likesNode.remove()
                    }

                    span.classList.add("elJfazUBui03YWZgHCbW")
                    button.classList.add("kc5CjvU5hT9KEj0iTt3C")

                    likesNode = document.createElement("span")
                    likesNode.classList.add("_MWOVuZRvUQdXKTMcOPx", "_oBLf5gprWsKjCw4Ce58", "_3_Mxw7Si7j2g4kWjlpR",)
                    likesNode.textContent = likes.toLocaleString()

                    button.appendChild(likesNode)
                }

                updateButton(likes)

                button.addEventListener("click", () => {
                    setTimeout(() => {
                            if (button.ariaPressed === "true") {
                            updateButton(likes + (liked ? 0 : 1))
                        }
                        else {
                            updateButton(likes + (liked ? -1 : 0))
                        }
                    }, 0)
                })
            }
        }

        if (artist.initDate || artist.genres || artist.counts || artist.description || entity.description) {
            const artistMetaContainer = node.querySelector?.(".PageHeaderArtist_meta__ZAlx_")
            if (artistMetaContainer) {
                const metaCotainer = artistMetaContainer.closest('.PageHeaderBase_meta__bMvfR')
                if (metaCotainer) {
                    const description = artist?.description?.text || entity.description
                    let descriptionSpanNode = metaCotainer.querySelector('.PageHeaderPlaylistMeta_description__edoVx')
                    if (description && getSetting("description") && !descriptionSpanNode) {
                        descriptionSpanNode = document.createElement("span")
                        descriptionSpanNode.textContent = description
                        descriptionSpanNode.classList.add("_MWOVuZRvUQdXKTMcOPx", "g3qWNP6xl__7qxNmtrvd", "_3_Mxw7Si7j2g4kWjlpR", "PageHeaderPlaylistMeta_description__edoVx")
                        metaCotainer.insertBefore(descriptionSpanNode, artistMetaContainer)
                    }

                    if (artist.initDate || artist.genres || artist.counts) {
                        let betterInfoSpan = metaCotainer.querySelector('.betterInfoSpan')
                        if (!betterInfoSpan) {
                            betterInfoSpan = document.createElement("span")
                            betterInfoSpan.classList.add("betterInfoSpan", "_MWOVuZRvUQdXKTMcOPx", "LezmJlldtbHWqU7l1950", "oyQL2RSmoNbNQf3Vc6YI", "g3qWNP6xl__7qxNmtrvd", "_3_Mxw7Si7j2g4kWjlpR", "PageHeaderPlaylistMeta_updatedText__FSo_0")
                            metaCotainer.insertBefore(betterInfoSpan, descriptionSpanNode?.nextSibling || metaCotainer.firstChild)
                        } 

                        function addInfo(textOrNode, id) {
                            id = "BetterInfoAlbum_betterInfoSpan#" + id
                            const existingNode = document.getElementById(id)

                            let node = textOrNode;
                            if (!(textOrNode instanceof Node)) {
                                node = document.createElement("div")
                                node.textContent = textOrNode
                            }

                            if ((!existingNode && betterInfoSpan.childElementCount > 0) || (existingNode && Array.from(existingNode.parentElement.children).indexOf(existingNode) > 0)) {
                                node.classList.add("PageHeaderAlbumMeta_year_dot__TrSFr")
                            }

                            node.id = id

                            if (!existingNode) {
                                betterInfoSpan.appendChild(node)
                            }
                            else {
                                existingNode.replaceWith(node)
                            }
                        }

                        if (artist.counts?.directAlbums && getSetting("albums")) {
                            addInfo(getPluralAlbumString(artist.counts?.directAlbums), "albums")
                        }

                        if (artist.counts?.tracks && getSetting("tracks")) {
                            addInfo(getPluralTrackString(artist.counts?.tracks), "tracks")
                        }

                        if (artist.initDate && getSetting("date")) {
                            addInfo("Дата рождения: " + getLocalizatedDate(artist.initDate), "date")
                        }

                        if (artist.genres && artist.genres.length > 0 && getSetting("genres")) {
                            addInfo(artist.genres.map(x => getLocalizatedGenre(x)).join(', '), "genres")
                        }

                        if (artist.countries && artist.countries.length > 0 && getSetting("country")) {
                            addInfo(artist.countries.join(", ", "country"))
                        }
                    }
                }
            }
        }
    }
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
})();