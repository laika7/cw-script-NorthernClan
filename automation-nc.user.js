// ==UserScript==
// @name         Автоматизированные отчёты
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Автоматизация отчётов и жезнеоблегчаловка
// @author       Воющий
// @match        *://catwar.su/blog230782*
// @match        *://catwar.net/blog230782*
// @match        *://catwar.su/blog169195*
// @match        *://catwar.net/blog169195*
// @match        *://catwar.su/blog216163*
// @match        *://catwar.net/blog216163*
// @match        *://catwar.su/blog373028*
// @match        *://catwar.net/blog373028*
// @match        *://catwar.su/blog217930*
// @match        *://catwar.net/blog217930*
// @match        *://catwar.su/blog223122*
// @match        *://catwar.net/blog223122*
// @match        *://catwar.su/ls*
// @match        *://catwar.net/ls*
// @icon         https://catwar.net/favicon.ico
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/laika7/cw-script-NorthernClan/refs/heads/main/automation-nc.user.js
// @downloadURL  https://raw.githubusercontent.com/laika7/cw-script-NorthernClan/refs/heads/main/automation-nc.user.js
// ==/UserScript==

(function() {
    'use strict';

    const url = document.URL;
    const isPlovcy = url.includes('/blog230782');
    const isHunt = url.includes('/blog169195');
    const isClean = url.includes('/blog216163');
    const isFight = url.includes('/blog373028');
    const isGuard = url.includes('/blog217930');
    const isKitten = url.includes('/blog223122');
    const isLsPage = window.location.pathname.includes('/ls');

    if (!isPlovcy && !isHunt && !isClean && !isFight && !isGuard && !isKitten && !isLsPage) return;

    const COLORS = {
        bgMain: '#2b323b',
        bgLight: '#eaeff6',
        bgAccent: '#a7b3c3',
        textLight: '#d3dce8',
        textDark: '#2b323b',
        border: '#2b323b',
        warning: 'darkred'
    };

    const PATROL_TIMES = ['12:30', '17:30', '19:30', '21:30'];

    function waitForElement(selector, callback) {
        const el = document.querySelector(selector);
        if (el) { callback(el); return; }
        const observer = new MutationObserver(() => {
            const found = document.querySelector(selector);
            if (found) { callback(found); observer.disconnect(); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function insertAfter(ref, newNode) {
        ref.parentNode.insertBefore(newNode, ref.nextSibling);
    }

    function getCurrentDateForInput() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDateForReport(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}.${month}.${year.slice(-2)}`;
    }

    function formatDateForHunt(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}.${month}.${year}`;
    }

    function getRandomViolation() {
        return Math.random() < 0.5 ? '–.' : 'отсутствуют.';
    }

    function getWordForm(number, wordForms) {
        const n = Math.abs(number) % 100;
        const n1 = n % 10;
        if (n > 10 && n < 20) return wordForms[2];
        if (n1 > 1 && n1 < 5) return wordForms[1];
        if (n1 === 1) return wordForms[0];
        return wordForms[2];
    }

    async function convertSingleNameToId(name) {
        if (!name || !name.trim()) return '';

        if (name.match(/^\[link\d+\]$/)) {
            return name;
        }

        if (name.match(/^\d+$/)) {
            return `[link${name}]`;
        }

        const formattedName = name.split(' ').map(word => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');

        const response = await fetch('/ajax/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                data: formattedName,
                delimiter: ',',
                template: '[link%id%]',
                type_in: '0',
                type_out: '0'
            })
        });
        return await response.text();
    }

    async function convertNamesToIds(input) {
        if (!input || !input.trim()) return '';

        const parts = input.split(',').map(p => p.trim()).filter(p => p);
        const convertedParts = [];

        for (const part of parts) {
            if (part === '—') {
                convertedParts.push('—');
                continue;
            }
            const converted = await convertSingleNameToId(part);
            convertedParts.push(converted || part);
        }

        return convertedParts.join(', ');
    }

    async function convertHuntersWithCounts(input) {
        if (!input || !input.trim()) return '';

        const parts = input.split(',').map(p => p.trim()).filter(p => p);
        const convertedParts = [];

        for (const part of parts) {
            const match = part.match(/^(.+?)\s*\((\d+)\)$/);
            if (match) {
                const name = match[1].trim();
                const count = match[2];
                const converted = await convertSingleNameToId(name);
                convertedParts.push(`${converted} (${count})`);
            } else {
                convertedParts.push(part);
            }
        }

        return convertedParts.join(', ');
    }

    function createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            background-color: ${COLORS.bgMain};
            color: ${COLORS.textLight};
            border: none;
            padding: 8px 12px;
            margin: 0 5px 5px 0;
            font-family: 'Bookman Old Style', serif;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 4px;
            transition: 0.2s;
            box-shadow: 0 2px 0 #1a1f26;
        `;
        btn.onmouseover = () => btn.style.backgroundColor = '#3a4450';
        btn.onmouseout = () => btn.style.backgroundColor = COLORS.bgMain;
        btn.onclick = (e) => {
            e.preventDefault();
            onClick();
        };
        return btn;
    }

    function createTemplatesTab() {
        const div = document.createElement('div');
        div.className = 'templates-tab';
        div.style.padding = '10px';
        div.style.display = 'flex';
        div.style.flexWrap = 'wrap';
        div.style.gap = '5px';
        div.style.justifyContent = 'center';

        const insertTemplate = (template) => {
            const field = document.querySelector('#comment');
            if (field) {
                field.value = template;
                field.focus();
            }
        };

        if (isPlovcy) {
            div.appendChild(createButton('Повышение уровня ПУ', () => {
                insertTemplate('Я, [[n]link[/n]ID], повысил(-а) свой уровень ПУ до n. [Скриншот-подтверждение]');
            }));
            div.appendChild(createButton('Повышение количества доступных лечений', () => {
                insertTemplate('Я, [[n]link[/n]ID], желаю повысить количество доступных мне лечений. [Скриншот УЗ]');
            }));
            div.appendChild(createButton('Водный патруль', () => {
                insertTemplate('[b]Водный патруль[/b]\n[b]Дата[/b]: дд.мм.гг;\n[b]Время[/b]: nn:nn;\n[b]Собирающий[/b]: [linkID];\n[b]Ведущий второй части[/b]: [linkID];\n[b]Участники[/b]: [linkID], [linkID];\n[b]Нарушения[/b]: [linkID] скриншот.');
            }));
            div.appendChild(createButton('Ношение котов на дно', () => {
                insertTemplate('Я, [[n]link[/n]ID], относил игрока [linkID] на дно n раз. [Скриншот-подтверждение]');
            }));
        }

        if (isGuard) {
            div.appendChild(createButton('Плановый патруль', () => {
                insertTemplate('[b]Плановый патруль[/b]\n[b]Дата[/b]: дд.мм.гг;\n[b]Время[/b]: nn:00;\n[b]Собирающий[/b]: [linkID];\n[b]Ведущий второй части[/b]: [linkID];\n[b]Участники[/b]: [linkID], [linkID];\n[b]Нарушения[/b]: [linkID] (фракция) — скриншот.');
            }));
            div.appendChild(createButton('Свободный патруль', () => {
                insertTemplate('[b]Свободный патруль[/b]\n[b]Дата[/b]: дд.мм.гг;\n[b]Собирающий[/b]: [linkID];\n[b]Ведущий второй части[/b]: [linkID];\n[b]Взятый временной отрезок[/b]: nn:nn — nn:nn;\n[b]Участники[/b]: [linkID], [linkID];\n[b]Нарушения[/b]: [linkID] (фракция) — скриншот.');
            }));
            div.appendChild(createButton('Начало дозора', () => {
                insertTemplate('[[n]link[/n]ID] вышел на [b][i]пассивное/активное[/i][/b] дежурство. Локация/маршрут: название.');
            }));
            div.appendChild(createButton('Отчёт дозора', () => {
                insertTemplate('[b]Активный ИЛИ пассивный дозор[/b]\n[b]Дежурный[/b]: [[n]link[/n]ID];\n[b]Дата[/b]: дд.мм.гг;\n[b]Часы дежурства[/b]: nn:nn — nn:nn;\n[b]Маршрут/Охраняемая локация[/b]: номер/название;\n[b]Нарушения[/b]: Имя ID (фракция) — скриншот.');
            }));
            div.appendChild(createButton('Детский патруль', () => {
                insertTemplate('[b]Детский патруль[/b]\n[b]Дата[/b]: дд.мм.гг;\n[b]Время[/b]: nn:00;\n[b]Собирающий[/b]: [linkID];\n[b]Ведущий второй части[/b]: [linkID];\n[b]Участники[/b]: [linkID], [linkID], [linkID].');
            }));
            div.appendChild(createButton('Начало детского дозора', () => {
                insertTemplate('[[n]link[/n]ID] вышел на [b][i]детское[/i][/b] дежурство. Маршрут: номер.');
            }));
            div.appendChild(createButton('Отчёт детского дозора', () => {
                insertTemplate('[b]Детский дозор[/b]\n[b]Дежурный[/b]: [[n]link[/n]ID];\n[b]Дата[/b]: дд.мм.гг;\n[b]Часы дежурства[/b]: nn:nn — nn:nn;\n[b]Маршрут[/b]: номер.');
            }));
            div.appendChild(createButton('Получение ачивки', () => {
                insertTemplate('[b]Ачивка[/b]\nЯ, ID, желаю получить ачивку под названием «название».\n[b]Выбор шапки:[/b] ночь/день.\n[b]Подтверждение:[/b] [url=ссылка]скриншот[/url].');
            }));
            div.appendChild(createButton('Начало задания', () => {
                insertTemplate('[b]Задание[/b]\nЯ, ID, приступаю к заданию №номер.');
            }));
            div.appendChild(createButton('Завершение задания', () => {
                insertTemplate('[b]Задание[/b]\nЯ, ID, выполнил задание №номер.\n[b]Начало отсчёта:[/b] [url=ссылка]скриншот[/url].\n[b]Подтверждение:[/b] [url=ссылка]скриншот[/url].');
            }));
        }

        if (isHunt) {
            div.appendChild(createButton('Охотничий патруль', () => {
                insertTemplate('[b]Дата:[/b] дд.мм.гг.\n[b]Собрал(а):[/b] [linkID].\n[b]Охотники (кол-во дичи в скобках):[/b] [linkID] (n).\n[b]Охотники, словившие особую дичь (кол-во дичи в скобках):[/b] [linkID] (n).\n[b]Носильщики:[/b] [linkID].');
            }));
            div.appendChild(createButton('Свободная охота', () => {
                insertTemplate('[b]Свободная охота[/b]\n[b]Дата:[/b] дд.мм.гг.\n[b]Охотник:[/b] [linkID].\n[b]Кол-во пойманной дичи:[/b] n.\n[b]Кол-во пойманной особой дичи:[/b] n.\n[b]Подтверждение:[/b] [header=со]скриншот[block=со][img]ссылка[/img][/block][/header].');
            }));
            div.appendChild(createButton('Бронирование чистки', () => {
                insertTemplate('[b]Бронирование чистки куч[/b]\n[b]Дата:[/b] дд.мм.гг.\n[b]Желающий чистить кучу:[/b] [linkID].');
            }));
            div.appendChild(createButton('Окончание чистки', () => {
                insertTemplate('[b]Чистка куч[/b]\n[b]Дата:[/b] дд.мм.гг.\n[b]Чистильщики:[/b] [linkID].');
            }));
            div.appendChild(createButton('Бронирование активной охоты', () => {
                insertTemplate('[b]Бронирование активной охоты[/b]\n[b]Дата и время:[/b] дд.мм.гг - 00:00.\n[b]Собирающий:[/b] [linkID].');
            }));
            div.appendChild(createButton('Окончание активной охоты', () => {
                insertTemplate('[b]Активная охота[/b]\n[b]Дата и время:[/b] дд.мм.гг - 00:00.\n[b]Боевая команда:[/b] [linkID], [linkID], [linkID], [linkID].');
            }));
            div.appendChild(createButton('Улов со дна и расщелин', () => {
                insertTemplate('[b]Улов[/b]\n[b]Добытчик (кол-во пойманного):[/b] [linkID] [ID] (n)\n[b]Подтверждение:[/b] [header=улов]скриншот[block=улов][img]ссылка[/img][/block][/header].');
            }));
        }

        if (isClean) {
            div.appendChild(createButton('Отчёт о чистке', () => {
                insertTemplate('[b]Чистильщик:[/b] [ID];\n[b]Кол-во убранных:[/b] n;\n[b]Доказательство:[/b] ссылка на скриншот, подтверждающий чистку.');
            }));
            div.appendChild(createButton('Отпись о нечестной уборке', () => {
                insertTemplate('[b]Провинившийся:[/b] [catID] [ID];\n[b]Нарушение:[/b] какое правило было нарушено;\n[b]Доказательство:[/b] ссылка на скриншот, подтверждающий виновность игрока.');
            }));
            div.appendChild(createButton('Отпись о спящем в неположенном месте', () => {
                insertTemplate('[catID] [ID] ушёл из игры в неположенном месте: Перевал/Величавый склон;\n[b]Доказательство:[/b] скриншот профиля кота, где видно последний заход в онлайн, и скриншот игровой;\n[b]ID зафиксировавшего нарушение:[/b] ID.');
            }));
            div.appendChild(createButton('Отпись об уборке заснувшего', () => {
                insertTemplate('[catID] [ID] ушёл из игры в неположенном месте: Перевал/Величавый склон.\n[b]Доказательство[/b] скриншот истории с уборкой, скриншот профиля кота, где видно последний заход в онлайн и скриншот игровой;\n[b]ID зафиксировавшего нарушение:[/b] ID.');
            }));
        }

        if (isFight) {
            div.appendChild(createButton('Парная тренировка', () => {
                insertTemplate('[b]Парное грушевание.[/b]\n[b]Дата:[/b] дд.мм.гг;\n[b]Временной промежуток:[/b] nn:nn-nn:nn [скриншоты со временем начала и окончания грушевания];\n[b]Большая груша:[/b] [linkID];\n[b]Маленькая груша:[/b] [linkID].');
            }));
            div.appendChild(createButton('Парная тренировка (несколько груш)', () => {
                insertTemplate('[b]Парное грушевание.[/b]\n[b]Дата:[/b] дд.мм.гг;\n[b]Временной промежуток:[/b] nn:nn-nn:nn [скриншоты со временем начала и окончания грушевания];\n[b]Большая груша:[/b] [linkID];\n[b]Маленькая груша:[/b] [linkID], [linkID] ( [url=скриншот начала]nn:nn[/url]-[url=скриншот окончания]nn:nn[/url] ).');
            }));
            div.appendChild(createButton('Одиночная тренировка', () => {
                insertTemplate('[b]Одиночное грушевание.[/b]\n[b]Дата:[/b] дд.мм.гг;\n[b]Временной промежуток:[/b] nn:nn-nn:nn [скриншоты со временем начала и окончания грушевания];\n[b]Грушующий:[/b] [linkID].');
            }));
            div.appendChild(createButton('Бронирование грушевания', () => {
                insertTemplate('[b]Бронирование грушевания[/b]\nДень: нн.нн\nВремя нн:нн — нн:нн.');
            }));
        }

        if (isKitten) {
            div.appendChild(createButton('Получение ачивки', () => {
                insertTemplate('[b]Ачивка[/b]\nЯ, ID, желаю получить ачивку под названием «название».\n[b]Выбор шапки:[/b] звезда/вода/листик.\n[b]Подтверждение:[/b] скриншот выполненных требований');
            }));
            div.appendChild(createButton('Получение ледяшек за медаль', () => {
                insertTemplate('[b]Медаль[/b]\nЯ, ID, желаю получить 15 ледяшек за медаль под названием «название».\n[b]Подтверждение:[/b] ссылка на изображение запроса с подтверждением/медали в профиле');
            }));
            div.appendChild(createButton('Отчёт о свободной охоте (бабочки)', () => {
                insertTemplate('[b]Охота[/b]\nЯ, ID, словил(а) 5 бабочек в рамках свободной охоты.');
            }));
            div.appendChild(createButton('Активация бабочки', () => {
                insertTemplate('[b]Детская активация[/b]\n[b]Активирующий:[/b] ID;\n[b]Тренирующийся:[/b] ID;\n[b]Количество БУ:[/b] N.');
            }));
            div.appendChild(createButton('Получение навыков', () => {
                insertTemplate('[b]Навыки[/b]\nЯ, ID, хочу получить ледяшки за прокаченный навык.\n[b]Вид навыка:[/b] нюх/копание/боевые умения/плавательные умения/лазательные умения/уровень зоркости/активность.\n[b]Уровень навыка:[/b] 3 / 4 / 5 / 6+ / ЛС / ХМ / ИИ+.\n[b]Подтверждение:[/b] ссылка на навыки');
            }));
            div.appendChild(createButton('Полезный ресурс со дна/расщелины', () => {
                insertTemplate('[b]Ресурс[/b]\nЯ, ID, хочу получить баллы за выловленный ресурс.\n[b]Вид ресурса:[/b] съедобная дичь/водяной мох/обычный мох/паутина/целебный ресурс/камень/ракушка ПУ/ракушка сон/перья.\n[b]Подтверждение:[/b] ссылка на скриншот, где виден ресурс во рту, дата и время.');
            }));
            div.appendChild(createButton('Активация (для хранителей)', () => {
                insertTemplate('[b]Активация[/b]\n[b]Активирующий:[/b] ID;\n[b]Тренирующийся:[/b] ID;\n[b]Количество БУ:[/b] N.');
            }));
            div.appendChild(createButton('Создание игрушек', () => {
                insertTemplate('[b]Игрушки[/b]\nЯ, ID, сделал(а) игрушки из подручных материалов для наших малышей.\n[b]Сделанные игрушки:[/b] название [количество], название [количество];\n[b]Подтверждение:[/b] [url=ССЫЛКА]скриншот[/url].');
            }));
            div.appendChild(createButton('Проведение вечера сказок', () => {
                insertTemplate('[b]Вечер сказок[/b]\n[b]Дата и время:[/b] NN.NN.NN, 00:00;\n[b]Ведущий:[/b] ID;\n[b]Список выступающих:[/b] ID, ID, ID;\n[b]Список слушателей:[/b] ID, ID, ID.');
            }));
            div.appendChild(createButton('Проведение охотничьего турнира', () => {
                insertTemplate('[b]Турнир[/b]\n[b]Дата и время:[/b] NN.NN.NN, 00:00;\n[b]Проводящий(ие):[/b] ID;\n[b]Список всех участников:[/b] ID (+), ID, ID.');
            }));
            div.appendChild(createButton('Сопровождение котёнка на Дрейфующие льды', () => {
                insertTemplate('[b]Водопой[/b]\n[b]Относящий:[/b] ID;\n[b]Котята:[/b] ID, ID, ID;\n[b]Время:[/b] чч:мм — чч:мм.');
            }));
            div.appendChild(createButton('Вылазка', () => {
                insertTemplate('[b]Вылазка[/b]\n[b]Цель вылазки:[/b] Экскурсия/Арин/Вылазка;\n[b]Проводящий:[/b] ID;\n[b]Котята:[/b] ID, ID, ID;\n[b]Подтверждение:[/b] время чч:мм — чч:мм/кол-во локаций до цветка.');
            }));
            div.appendChild(createButton('Обновление информации о семье', () => {
                insertTemplate('[b]Гнёздышко[/b]\n[b]Родители:[/b] ID x ID.\nТребуется замена личной карточки/профиля вк/сфер деятельности/etc.\n[b]Новая информация:[/b] текст');
            }));
            div.appendChild(createButton('Выпуск котёнка', () => {
                insertTemplate('[b]Гнёздышко[/b]\n[b]Родители:[/b] ID x ID.\nНекоторые котята в нашей семье подросли и стали воспитанниками.\n[b]Котята-выпускники:[/b] ID.');
            }));
            div.appendChild(createButton('Пополнение в семье', () => {
                insertTemplate('[b]Гнёздышко[/b]\n[b]Родители:[/b] ID x ID.\nВ нашей семье прибавление.\n[b]Новая информация:[/b] [[n]link[/n]ID], [[n]link[/n]ID], [[n]link[/n]ID].');
            }));
        }

        return div;
    }

    function createGuardPlannedForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Плановый патруль</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Дата:</span> <input type="date" id="planned_date" value="${getCurrentDateForInput()}" style="width: 100%;">
            <span>Время:</span> <select id="planned_time" style="width: 100%;">
                <option value="12:00">12:00</option>
                <option value="17:00">17:00</option>
                <option value="20:00">20:00</option>
                <option value="22:00">22:00</option>
            </select>
            <span>Собирающий:</span> <input type="text" id="planned_collector" placeholder="ID или имя" style="width: 100%;">
            <span>Ведущий второй части:</span> <input type="text" id="planned_coleader" placeholder="ID, имя или —" style="width: 100%;">
            <span>Участники:</span> <input type="text" id="planned_participants" placeholder="ID или имена через запятую" style="width: 100%;">
        </div>

        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin: 15px 0 10px 0; font-weight: bold;">Нарушения</div>
        <div id="planned_violations_container"></div>
        <button id="add_planned_violation" style="margin: 10px 0; padding: 4px 8px; background:${COLORS.bgAccent}; color:${COLORS.textDark}; border:none; cursor:pointer;">➕ Добавить нарушение</button>

        <button id="planned_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        function createViolationRow(violator = '', faction = 'Клан Падающей Воды', link = '') {
            const row = document.createElement('div');
            row.className = 'violation-row';
            row.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 180px 1fr auto;
            gap: 8px;
            margin-bottom: 8px;
            padding: 8px;
            background-color: rgba(0,0,0,0.05);
            border-radius: 4px;
        `;

            row.innerHTML = `
            <input type="text" class="violation_name" placeholder="Имя или ID" value="${violator}" style="width: 100%; padding: 3px;">
            <select class="violation_faction" style="width: 100%; padding: 3px;">
                <option value="Клан Падающей Воды" ${faction === 'Клан Падающей Воды' ? 'selected' : ''}>Клан Падающей Воды</option>
                <option value="Грозовое племя" ${faction === 'Грозовое племя' ? 'selected' : ''}>Грозовое племя</option>
                <option value="Речное племя" ${faction === 'Речное племя' ? 'selected' : ''}>Речное племя</option>
                <option value="Племя Теней" ${faction === 'Племя Теней' ? 'selected' : ''}>Племя Теней</option>
                <option value="Племя Ветра" ${faction === 'Племя Ветра' ? 'selected' : ''}>Племя Ветра</option>
                <option value="одиночки" ${faction === 'одиночки' ? 'selected' : ''}>одиночки</option>
            </select>
            <input type="text" class="violation_link" placeholder="Ссылка на скриншот" value="${link}" style="width: 100%; padding: 3px;">
            <button class="remove_violation" style="background:${COLORS.warning}; color:white; border:none; cursor:pointer; padding:2px 8px;">✕</button>
        `;

            row.querySelector('.remove_violation').onclick = () => row.remove();
            return row;
        }

        const container = div.querySelector('#planned_violations_container');
        const addBtn = div.querySelector('#add_planned_violation');
        container.appendChild(createViolationRow());

        addBtn.onclick = (e) => {
            e.preventDefault();
            container.appendChild(createViolationRow());
        };

        div.querySelector('#planned_submit').onclick = async () => {
            const dateInput = div.querySelector('#planned_date').value;
            const date = dateInput ? formatDateForReport(dateInput) : 'дд.мм.гг';
            const time = div.querySelector('#planned_time').value;
            const collector = div.querySelector('#planned_collector').value;
            const coleader = div.querySelector('#planned_coleader').value || '—';
            const participants = div.querySelector('#planned_participants').value;

            let convertedCollector = '[linkID]';
            if (collector) {
                if (collector.match(/^\[link\d+\]$/)) {
                    convertedCollector = collector;
                } else if (collector.match(/^\d+$/)) {
                    convertedCollector = `[link${collector}]`;
                } else {
                    const converted = await convertSingleNameToId(collector);
                    convertedCollector = converted || collector;
                }
            }

            let convertedColeader = '—';
            if (coleader && coleader !== '—') {
                if (coleader.match(/^\[link\d+\]$/)) {
                    convertedColeader = coleader;
                } else if (coleader.match(/^\d+$/)) {
                    convertedColeader = `[link${coleader}]`;
                } else {
                    const converted = await convertSingleNameToId(coleader);
                    convertedColeader = converted || coleader;
                }
            }

            let convertedParticipants = '[linkID]';
            if (participants) {
                const participantList = participants.split(',').map(p => p.trim()).filter(p => p);
                const convertedList = [];
                for (const p of participantList) {
                    if (p.match(/^\[link\d+\]$/)) {
                        convertedList.push(p);
                    } else if (p.match(/^\d+$/)) {
                        convertedList.push(`[link${p}]`);
                    } else {
                        const converted = await convertSingleNameToId(p);
                        convertedList.push(converted || p);
                    }
                }
                convertedParticipants = convertedList.join(', ');
            }

            const violationRows = document.querySelectorAll('#planned_violations_container .violation-row');
            const violations = [];

            for (const row of violationRows) {
                const name = row.querySelector('.violation_name')?.value.trim();
                const faction = row.querySelector('.violation_faction')?.value;
                const link = row.querySelector('.violation_link')?.value.trim();

                if (name) {
                    let linkId = '';
                    if (name.match(/^\d+$/)) {
                        linkId = `[link${name}]`;
                    } else if (name.match(/^\[link\d+\]$/)) {
                        linkId = name;
                    } else {
                        const converted = await convertSingleNameToId(name);
                        linkId = converted || name;
                    }

                    let violation = `${linkId} (${faction})`;
                    if (link) {
                        violation += ` — [url=${link}]скриншот[/url]`;
                    }
                    violations.push(violation);
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                let violationsText = 'отсутствуют.';
                if (violations.length > 0) {
                    violationsText = violations.join('; ');
                }

                field.value = `[b]Плановый патруль[/b]\n[b]Дата[/b]: ${date};\n[b]Время[/b]: ${time};\n[b]Собирающий[/b]: ${convertedCollector};\n[b]Ведущий второй части[/b]: ${convertedColeader};\n[b]Участники[/b]: ${convertedParticipants};\n[b]Нарушения[/b]: ${violationsText}`;
                field.focus();
            }
        };

        return div;
    }

    function createGuardFreeForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Свободный патруль</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Дата:</span> <input type="date" id="free_guard_date" value="${getCurrentDateForInput()}" style="width: 100%;">
            <span>Собирающий:</span> <input type="text" id="free_guard_collector" placeholder="ID или имя" style="width: 100%;">
            <span>Ведущий 2 части:</span> <input type="text" id="free_guard_coleader" placeholder="ID, имя или —" style="width: 100%;">
            <span>Время начала:</span> <input type="time" id="free_guard_start" value="00:15" style="width: 100%;" step="60">
            <span>Время окончания:</span> <input type="time" id="free_guard_end" value="00:30" style="width: 100%;" step="60">
            <span>Участники:</span> <input type="text" id="free_guard_participants" placeholder="ID или имена через запятую" style="width: 100%;">
        </div>

        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin: 15px 0 10px 0; font-weight: bold;">Нарушения</div>
        <div id="free_violations_container"></div>
        <button id="add_free_violation" style="margin: 10px 0; padding: 4px 8px; background:${COLORS.bgAccent}; color:${COLORS.textDark}; border:none; cursor:pointer;">➕ Добавить нарушение</button>

        <button id="free_guard_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        function createViolationRow(violator = '', faction = 'Клан Падающей Воды', link = '') {
            const row = document.createElement('div');
            row.className = 'violation-row';
            row.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 180px 1fr auto;
            gap: 8px;
            margin-bottom: 8px;
            padding: 8px;
            background-color: rgba(0,0,0,0.05);
            border-radius: 4px;
        `;

            row.innerHTML = `
            <input type="text" class="violation_name" placeholder="Имя или ID" value="${violator}" style="width: 100%; padding: 3px;">
            <select class="violation_faction" style="width: 100%; padding: 3px;">
                <option value="Клан Падающей Воды" ${faction === 'Клан Падающей Воды' ? 'selected' : ''}>Клан Падающей Воды</option>
                <option value="Грозовое племя" ${faction === 'Грозовое племя' ? 'selected' : ''}>Грозовое племя</option>
                <option value="Речное племя" ${faction === 'Речное племя' ? 'selected' : ''}>Речное племя</option>
                <option value="Племя Теней" ${faction === 'Племя Теней' ? 'selected' : ''}>Племя Теней</option>
                <option value="Племя Ветра" ${faction === 'Племя Ветра' ? 'selected' : ''}>Племя Ветра</option>
                <option value="одиночки" ${faction === 'одиночки' ? 'selected' : ''}>одиночки</option>
            </select>
            <input type="text" class="violation_link" placeholder="Ссылка на скриншот" value="${link}" style="width: 100%; padding: 3px;">
            <button class="remove_violation" style="background:${COLORS.warning}; color:white; border:none; cursor:pointer; padding:2px 8px;">✕</button>
        `;

            row.querySelector('.remove_violation').onclick = () => row.remove();
            return row;
        }

        const container = div.querySelector('#free_violations_container');
        const addBtn = div.querySelector('#add_free_violation');
        container.appendChild(createViolationRow());

        addBtn.onclick = (e) => {
            e.preventDefault();
            container.appendChild(createViolationRow());
        };

        div.querySelector('#free_guard_submit').onclick = async () => {
            const dateInput = div.querySelector('#free_guard_date').value;
            const date = dateInput ? formatDateForReport(dateInput) : 'дд.мм.гг';
            const collector = div.querySelector('#free_guard_collector').value;
            const coleader = div.querySelector('#free_guard_coleader').value || '—';
            const start = div.querySelector('#free_guard_start').value || '00:15';
            const end = div.querySelector('#free_guard_end').value || '00:30';
            const participants = div.querySelector('#free_guard_participants').value;

            let convertedCollector = '[linkID]';
            if (collector) {
                if (collector.match(/^\[link\d+\]$/)) {
                    convertedCollector = collector;
                } else if (collector.match(/^\d+$/)) {
                    convertedCollector = `[link${collector}]`;
                } else {
                    const converted = await convertSingleNameToId(collector);
                    convertedCollector = converted || collector;
                }
            }

            let convertedColeader = '—';
            if (coleader && coleader !== '—') {
                if (coleader.match(/^\[link\d+\]$/)) {
                    convertedColeader = coleader;
                } else if (coleader.match(/^\d+$/)) {
                    convertedColeader = `[link${coleader}]`;
                } else {
                    const converted = await convertSingleNameToId(coleader);
                    convertedColeader = converted || coleader;
                }
            }

            let convertedParticipants = '';
            if (participants) {
                const participantList = participants.split(',').map(p => p.trim()).filter(p => p);
                const convertedList = [];

                for (const p of participantList) {
                    if (p.match(/^\[link\d+\]$/)) {
                        convertedList.push(p);
                    } else if (p.match(/^\d+$/)) {
                        convertedList.push(`[link${p}]`);
                    } else {
                        const converted = await convertSingleNameToId(p);
                        convertedList.push(converted || p);
                    }
                }
                convertedParticipants = convertedList.join(', ');
            } else {
                convertedParticipants = '[linkID], [linkID]';
            }

            const violationRows = document.querySelectorAll('#free_violations_container .violation-row');
            const violations = [];

            for (const row of violationRows) {
                const name = row.querySelector('.violation_name')?.value.trim();
                const faction = row.querySelector('.violation_faction')?.value;
                const link = row.querySelector('.violation_link')?.value.trim();

                if (name) {
                    let linkId = '';
                    if (name.match(/^\d+$/)) {
                        linkId = `[link${name}]`;
                    } else if (name.match(/^\[link\d+\]$/)) {
                        linkId = name;
                    } else {
                        const converted = await convertSingleNameToId(name);
                        linkId = converted || name;
                    }

                    let violation = `${linkId} (${faction})`;
                    if (link) {
                        violation += ` — [url=${link}]скриншот[/url]`;
                    }
                    violations.push(violation);
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                let violationsText = 'отсутствуют.';
                if (violations.length > 0) {
                    violationsText = violations.join('; ');
                }

                field.value = `[b]Свободный патруль[/b]\n[b]Дата[/b]: ${date};\n[b]Собирающий[/b]: ${convertedCollector};\n[b]Ведущий второй части[/b]: ${convertedColeader};\n[b]Взятый временной отрезок[/b]: ${start} — ${end};\n[b]Участники[/b]: ${convertedParticipants};\n[b]Нарушения[/b]: ${violationsText}`;
                field.focus();
            }
        };

        return div;
    }

    function createGuardStartForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Начало дозора</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Ваш ID/имя:</span> <input type="text" id="start_guard_id" placeholder="ID или имя" style="width: 100%;">
            <span>Тип:</span>
            <select id="start_guard_type" style="width: 100%;">
                <option value="пассивное">пассивное</option>
                <option value="активное">активное</option>
            </select>
            <span>Маршрут/локация:</span>
            <select id="start_guard_route" style="width: 100%;"></select>
        </div>
        <button id="start_guard_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        const typeSelect = div.querySelector('#start_guard_type');
        const routeSelect = div.querySelector('#start_guard_route');

        function updateRoutes() {
            const type = typeSelect.value;
            routeSelect.innerHTML = '';

            if (type === 'активное') {
                const routes = [
                    '1', '2', '3', '4', '5'
                ];
                routes.forEach(route => {
                    const option = document.createElement('option');
                    option.value = route;
                    option.textContent = route;
                    routeSelect.appendChild(option);
                });
            } else {
                const routes = [
                    'Крутой подъём',
                    'Ельник',
                    'Мёрзлые земли',
                    'Ледопад',
                    'Заиндевевшие кусты голубики',
                    'Манящий обрыв'
                ];
                routes.forEach(route => {
                    const option = document.createElement('option');
                    option.value = route;
                    option.textContent = route;
                    routeSelect.appendChild(option);
                });
            }
        }

        typeSelect.addEventListener('change', updateRoutes);
        updateRoutes();

        div.querySelector('#start_guard_submit').onclick = async () => {
            const id = div.querySelector('#start_guard_id').value;
            const type = typeSelect.value;
            const route = routeSelect.value;

            let convertedId = '[[n]link[/n]ID]';
            if (id) {
                if (id.match(/^\d+$/)) {
                    convertedId = `[[n]link[/n]${id}]`;
                } else if (id.match(/^\[link\d+\]$/)) {
                    const num = id.match(/\d+/)[0];
                    convertedId = `[[n]link[/n]${num}]`;
                } else {
                    const converted = await convertSingleNameToId(id);
                    const num = converted.match(/\d+/);
                    if (num) {
                        convertedId = `[[n]link[/n]${num[0]}]`;
                    } else {
                        convertedId = id;
                    }
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `${convertedId} вышел на [b][i]${type}[/i][/b] дежурство. ${type === 'пассивное' ? 'Локация' : 'Маршрут'}: ${route}.`;
                field.focus();
            }
        };

        return div;
    }

    function createGuardReportForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Отчёт дозора</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Тип:</span>
            <select id="report_guard_type" style="width: 100%;">
                <option value="Активный">Активный</option>
                <option value="Пассивный">Пассивный</option>
            </select>
            <span>Дежурный:</span> <input type="text" id="report_guard_id" placeholder="ID или имя" style="width: 100%;">
            <span>Дата:</span> <input type="date" id="report_guard_date" value="${getCurrentDateForInput()}" style="width: 100%;">
            <span>Часы начала:</span> <input type="time" id="report_guard_start" value="06:55" style="width: 100%;" step="60">
            <span>Часы окончания:</span> <input type="time" id="report_guard_end" value="08:55" style="width: 100%;" step="60">
            <span>Маршрут/локация:</span>
            <select id="report_guard_route" style="width: 100%;"></select>
        </div>
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin: 15px 0 10px 0; font-weight: bold;">Нарушения</div>
        <div id="report_violations_container"></div>
        <button id="add_report_violation" style="margin: 10px 0; padding: 4px 8px; background:${COLORS.bgAccent}; color:${COLORS.textDark}; border:none; cursor:pointer;">➕ Добавить нарушение</button>
        <button id="report_guard_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        const typeSelect = div.querySelector('#report_guard_type');
        const routeSelect = div.querySelector('#report_guard_route');

        function updateRoutes() {
            const type = typeSelect.value;
            routeSelect.innerHTML = '';

            if (type === 'Активный') {
                const routes = ['1', '2', '3', '4', '5'];
                routes.forEach(route => {
                    const option = document.createElement('option');
                    option.value = route;
                    option.textContent = route;
                    routeSelect.appendChild(option);
                });
            } else {
                const routes = [
                    'Крутой подъём',
                    'Ельник',
                    'Мёрзлые земли',
                    'Ледопад',
                    'Заиндевевшие кусты голубики',
                    'Манящий обрыв'
                ];
                routes.forEach(route => {
                    const option = document.createElement('option');
                    option.value = route;
                    option.textContent = route;
                    routeSelect.appendChild(option);
                });
            }
        }

        typeSelect.addEventListener('change', updateRoutes);
        updateRoutes();

        function createViolationRow(violator = '', faction = 'Клан Падающей Воды', link = '') {
            const row = document.createElement('div');
            row.className = 'violation-row';
            row.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 180px 1fr auto;
            gap: 8px;
            margin-bottom: 8px;
            padding: 8px;
            background-color: rgba(0,0,0,0.05);
            border-radius: 4px;
        `;
            row.innerHTML = `
            <input type="text" class="violation_name" placeholder="Имя или ID" value="${violator}" style="width: 100%; padding: 3px;">
            <select class="violation_faction" style="width: 100%; padding: 3px;">
                <option value="Клан Падающей Воды" ${faction === 'Клан Падающей Воды' ? 'selected' : ''}>Клан Падающей Воды</option>
                <option value="Грозовое племя" ${faction === 'Грозовое племя' ? 'selected' : ''}>Грозовое племя</option>
                <option value="Речное племя" ${faction === 'Речное племя' ? 'selected' : ''}>Речное племя</option>
                <option value="Племя Теней" ${faction === 'Племя Теней' ? 'selected' : ''}>Племя Теней</option>
                <option value="Племя Ветра" ${faction === 'Племя Ветра' ? 'selected' : ''}>Племя Ветра</option>
                <option value="одиночки" ${faction === 'одиночки' ? 'selected' : ''}>одиночки</option>
            </select>
            <input type="text" class="violation_link" placeholder="Ссылка на скриншот" value="${link}" style="width: 100%; padding: 3px;">
            <button class="remove_violation" style="background:${COLORS.warning}; color:white; border:none; cursor:pointer; padding:2px 8px;">✕</button>
        `;
            row.querySelector('.remove_violation').onclick = () => row.remove();
            return row;
        }

        const container = div.querySelector('#report_violations_container');
        const addBtn = div.querySelector('#add_report_violation');
        container.appendChild(createViolationRow());

        addBtn.onclick = (e) => {
            e.preventDefault();
            container.appendChild(createViolationRow());
        };

        div.querySelector('#report_guard_submit').onclick = async () => {
            const type = typeSelect.value;
            const id = div.querySelector('#report_guard_id').value;
            const dateInput = div.querySelector('#report_guard_date').value;
            const date = dateInput ? formatDateForReport(dateInput) : 'дд.мм.гг';
            const start = div.querySelector('#report_guard_start').value || '00:00';
            const end = div.querySelector('#report_guard_end').value || '00:00';
            const route = routeSelect.value;

            let convertedId = '[[n]link[/n]ID]';
            if (id) {
                if (id.match(/^\d+$/)) {
                    convertedId = `[[n]link[/n]${id}]`;
                } else if (id.match(/^\[link\d+\]$/)) {
                    const num = id.match(/\d+/)[0];
                    convertedId = `[[n]link[/n]${num}]`;
                } else {
                    const converted = await convertSingleNameToId(id);
                    const num = converted.match(/\d+/);
                    if (num) {
                        convertedId = `[[n]link[/n]${num[0]}]`;
                    } else {
                        convertedId = id;
                    }
                }
            }

            const violationRows = document.querySelectorAll('#report_violations_container .violation-row');
            const violations = [];

            for (const row of violationRows) {
                const name = row.querySelector('.violation_name')?.value.trim();
                const faction = row.querySelector('.violation_faction')?.value;
                const link = row.querySelector('.violation_link')?.value.trim();

                if (name) {
                    let nameWithId = name;
                    if (!name.match(/^\d+$/) && !name.match(/^\[link\d+\]$/)) {
                        const converted = await convertSingleNameToId(name);
                        const idMatch = converted.match(/\[link(\d+)\]/);
                        if (idMatch) {
                            nameWithId = `${name} ${idMatch[1]}`;
                        }
                    } else if (name.match(/^\d+$/)) {
                        nameWithId = `[link${name}] ${name}`;
                    }

                    let violation = `${nameWithId} (${faction})`;
                    if (link) {
                        violation += ` — [url=${link}]скриншот[/url]`;
                    }
                    violations.push(violation);
                }
            }

            let result = `[b]${type} дозор[/b]\n[b]Дежурный[/b]: ${convertedId};\n[b]Дата[/b]: ${date};\n[b]Часы дежурства[/b]: ${start} — ${end};\n`;
            result += type === 'Активный' ? `[b]Маршрут[/b]: ${route};\n` : `[b]Охраняемая локация[/b]: ${route};\n`;

            let violationsText = 'отсутствуют.';
            if (violations.length > 0) {
                violationsText = violations.join('; ');
            }
            result += `[b]Нарушения[/b]: ${violationsText}`;

            const field = document.querySelector('#comment');
            if (field) {
                field.value = result;
                field.focus();
            }
        };

        return div;
    }

    function createGuardChildPatrolForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Детский патруль</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Дата:</span> <input type="date" id="child_patrol_date" value="${getCurrentDateForInput()}" style="width: 100%;">
            <span>Время:</span> <select id="child_patrol_time" style="width: 100%;">
                <option value="12:00">12:00</option>
                <option value="17:00">17:00</option>
                <option value="20:00">20:00</option>
                <option value="22:00">22:00</option>
                <option value="00:00">00:00</option>
                <option value="04:00">04:00</option>
                <option value="07:00">07:00</option>
                <option value="09:00">09:00</option>
            </select>
            <span>Собирающий:</span> <input type="text" id="child_patrol_collector" placeholder="ID или имя" style="width: 100%;">
            <span>Ведущий 2 части:</span> <input type="text" id="child_patrol_coleader" placeholder="ID, имя или —" style="width: 100%;">
            <span>Участники:</span> <input type="text" id="child_patrol_participants" placeholder="ID или имена через запятую" style="width: 100%;">
        </div>
        <button id="child_patrol_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#child_patrol_submit').onclick = async () => {
            const dateInput = div.querySelector('#child_patrol_date').value;
            const date = dateInput ? formatDateForReport(dateInput) : 'дд.мм.гг';
            const time = div.querySelector('#child_patrol_time').value;
            const collector = div.querySelector('#child_patrol_collector').value;
            const coleader = div.querySelector('#child_patrol_coleader').value || '—';
            const participants = div.querySelector('#child_patrol_participants').value;

            let convertedCollector = '[linkID]';
            let convertedColeader = '[linkID]';
            let convertedParticipants = '[linkID]';

            if (collector) {
                const converted = await convertNamesToIds(collector);
                convertedCollector = converted;
            }
            if (coleader && coleader !== '—') {
                const converted = await convertNamesToIds(coleader);
                convertedColeader = converted;
            }
            if (participants) {
                convertedParticipants = await convertNamesToIds(participants);
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Детский патруль[/b]\n[b]Дата[/b]: ${date};\n[b]Время[/b]: ${time};\n[b]Собирающий[/b]: ${convertedCollector};\n[b]Ведущий второй части[/b]: ${convertedColeader};\n[b]Участники[/b]: ${convertedParticipants}.`;
                field.focus();
            }
        };

        return div;
    }

    function createGuardChildStartForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Начало детского дозора</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Ваш ID/имя:</span> <input type="text" id="child_start_id" placeholder="ID или имя" style="width: 100%;">
            <span>Маршрут:</span>
            <select id="child_start_route" style="width: 100%;">
                <option value="1">1</option>
                <option value="2">2</option>
            </select>
        </div>
        <button id="child_start_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#child_start_submit').onclick = async () => {
            const id = div.querySelector('#child_start_id').value;
            const route = div.querySelector('#child_start_route').value;

            let convertedId = '[[n]link[/n]ID]';
            if (id) {
                if (id.match(/^\d+$/)) {
                    convertedId = `[[n]link[/n]${id}]`;
                } else if (id.match(/^\[link\d+\]$/)) {
                    const num = id.match(/\d+/)[0];
                    convertedId = `[[n]link[/n]${num}]`;
                } else {
                    const converted = await convertSingleNameToId(id);
                    const num = converted.match(/\d+/);
                    if (num) {
                        convertedId = `[[n]link[/n]${num[0]}]`;
                    } else {
                        convertedId = id;
                    }
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `${convertedId} вышел на [b][i]детское[/i][/b] дежурство. Маршрут: ${route}.`;
                field.focus();
            }
        };

        return div;
    }

    function createGuardChildReportForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Отчёт детского дозора</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Дежурный:</span> <input type="text" id="child_report_id" placeholder="ID или имя" style="width: 100%;">
            <span>Дата:</span> <input type="date" id="child_report_date" value="${getCurrentDateForInput()}" style="width: 100%;">
            <span>Часы начала:</span> <input type="time" id="child_report_start" value="18:00" style="width: 100%;" step="60">
            <span>Часы окончания:</span> <input type="time" id="child_report_end" value="20:30" style="width: 100%;" step="60">
            <span>Маршрут:</span>
            <select id="child_report_route" style="width: 100%;">
                <option value="1">1</option>
                <option value="2">2</option>
            </select>
        </div>
        <button id="child_report_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#child_report_submit').onclick = async () => {
            const id = div.querySelector('#child_report_id').value;
            const dateInput = div.querySelector('#child_report_date').value;
            const date = dateInput ? formatDateForReport(dateInput) : 'дд.мм.гг';
            const start = div.querySelector('#child_report_start').value || '00:00';
            const end = div.querySelector('#child_report_end').value || '00:00';
            const route = div.querySelector('#child_report_route').value;

            let convertedId = '[[n]link[/n]ID]';
            if (id) {
                if (id.match(/^\d+$/)) {
                    convertedId = `[[n]link[/n]${id}]`;
                } else if (id.match(/^\[link\d+\]$/)) {
                    const num = id.match(/\d+/)[0];
                    convertedId = `[[n]link[/n]${num}]`;
                } else {
                    const converted = await convertSingleNameToId(id);
                    const num = converted.match(/\d+/);
                    if (num) {
                        convertedId = `[[n]link[/n]${num[0]}]`;
                    } else {
                        convertedId = id;
                    }
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Детский дозор[/b]\n[b]Дежурный[/b]: ${convertedId};\n[b]Дата[/b]: ${date};\n[b]Часы дежурства[/b]: ${start} — ${end};\n[b]Маршрут[/b]: ${route}.`;
                field.focus();
            }
        };

        return div;
    }

    function createGuardAchievementForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Получение ачивки</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Ваш ID/имя:</span> <input type="text" id="guard_achieve_id" placeholder="ID или имя" style="width: 100%;">
            <span>Название ачивки:</span> <input type="text" id="guard_achieve_name" placeholder="название" style="width: 100%;">
            <span>Выбор шапки:</span>
            <select id="guard_achieve_hat" style="width: 100%;">
                <option value="">Не выбрано</option>
                <option value="ночь">ночь</option>
                <option value="день">день</option>
            </select>
            <span>Скриншот:</span> <input type="text" id="guard_achieve_link" placeholder="ссылка" style="width: 100%;">
        </div>
        <button id="guard_achieve_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#guard_achieve_submit').onclick = async () => {
            const id = div.querySelector('#guard_achieve_id').value;
            const name = div.querySelector('#guard_achieve_name').value || 'название';
            const hat = div.querySelector('#guard_achieve_hat').value;
            const link = div.querySelector('#guard_achieve_link').value || 'ссылка';

            let convertedId = 'ID';
            if (id) {
                const converted = await convertNamesToIds(id);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedId = idMatch ? idMatch[1] : id;
            }

            let hatLine = '';
            if (hat) {
                hatLine = `\n[b]Выбор шапки:[/b] ${hat}.`;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Ачивка[/b]\nЯ, ${convertedId}, желаю получить ачивку под названием «${name}».${hatLine}\n[b]Подтверждение:[/b] ${link}`;
                field.focus();
            }
        };

        return div;
    }

    function createGuardTaskStartForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Начало задания</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Ваш ID/имя:</span> <input type="text" id="task_start_id" placeholder="ID или имя" style="width: 100%;">
            <span>Номер задания:</span> <input type="text" id="task_start_num" placeholder="2" style="width: 100%;">
        </div>
        <button id="task_start_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#task_start_submit').onclick = async () => {
            const id = div.querySelector('#task_start_id').value;
            const num = div.querySelector('#task_start_num').value || 'номер';

            let convertedId = 'ID';
            if (id) {
                const converted = await convertNamesToIds(id);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedId = idMatch ? idMatch[1] : id;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Задание[/b]\nЯ, ${convertedId}, приступаю к заданию №${num}.`;
                field.focus();
            }
        };

        return div;
    }

    function createGuardTaskCompleteForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Завершение задания</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Ваш ID/имя:</span> <input type="text" id="task_complete_id" placeholder="ID или имя" style="width: 100%;">
            <span>Номер задания:</span> <input type="text" id="task_complete_num" placeholder="2" style="width: 100%;">
            <span>Скриншот начала:</span> <input type="text" id="task_complete_start" placeholder="ссылка" style="width: 100%;">
            <span>Подтверждение:</span> <input type="text" id="task_complete_proof" placeholder="ссылка" style="width: 100%;">
        </div>
        <button id="task_complete_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#task_complete_submit').onclick = async () => {
            const id = div.querySelector('#task_complete_id').value;
            const num = div.querySelector('#task_complete_num').value || 'номер';
            const startLink = div.querySelector('#task_complete_start').value || 'ссылка';
            const proofLink = div.querySelector('#task_complete_proof').value || 'ссылка';

            let convertedId = 'ID';
            if (id) {
                const converted = await convertNamesToIds(id);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedId = idMatch ? idMatch[1] : id;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Задание[/b]\nЯ, ${convertedId}, выполнил задание №${num}.\n[b]Начало отсчёта:[/b] [url=${startLink}]скриншот[/url].\n[b]Подтверждение:[/b] [url=${proofLink}]скриншот[/url].`;
                field.focus();
            }
        };

        return div;
    }

    function createHuntPatrolForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Охотничий патруль</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
                <span>Дата:</span> <input type="date" id="hunt_date" value="${getCurrentDateForInput()}" style="width: 100%;">
                <span>Собрал(а):</span> <input type="text" id="hunt_leader" placeholder="ID или имя" style="width: 100%;">
                <span>Охотники (дичь):</span> <input type="text" id="hunt_hunters" placeholder="ID (n дичи) или имена (n дичи) через запятую" style="width: 100%;">
                <span>Особая дичь:</span> <input type="text" id="hunt_special" placeholder="ID (n дичи) или имена (n дичи) через запятую если есть" style="width: 100%;">
                <span>Носильщики:</span> <input type="text" id="hunt_carriers" placeholder="ID или имена через запятую, или -" style="width: 100%;">
            </div>
            <button id="hunt_patrol_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
        `;

        div.querySelector('#hunt_patrol_submit').onclick = async () => {
            const dateInput = div.querySelector('#hunt_date').value;
            const date = dateInput ? formatDateForHunt(dateInput) + '.' : 'дд.мм.гг.';
            const leader = div.querySelector('#hunt_leader').value;
            const hunters = div.querySelector('#hunt_hunters').value;
            const special = div.querySelector('#hunt_special').value;
            const carriers = div.querySelector('#hunt_carriers').value;

            let convertedLeader = '[linkID]';
            let convertedHunters = '';
            let convertedSpecial = '';
            let convertedCarriers = '[linkID]';

            if (leader) {
                convertedLeader = await convertNamesToIds(leader);
            }
            if (hunters) {
                convertedHunters = await convertHuntersWithCounts(hunters);
            }
            if (special) {
                const converted = await convertHuntersWithCounts(special);
                convertedSpecial = `\n[b]Охотники, словившие особую дичь (кол-во дичи в скобках):[/b] ${converted}.`;
            }
            if (carriers) {
                convertedCarriers = await convertNamesToIds(carriers);
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Дата:[/b] ${date}\n[b]Собрал(а):[/b] ${convertedLeader}.\n[b]Охотники (кол-во дичи в скобках):[/b] ${convertedHunters}.${convertedSpecial}\n[b]Носильщики:[/b] ${convertedCarriers}.`;
                field.focus();
            }
        };

        return div;
    }

    function createHuntFreeForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Свободная охота</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
                <span>Дата:</span> <input type="date" id="free_date" value="${getCurrentDateForInput()}" style="width: 100%;">
                <span>Охотник:</span> <input type="text" id="free_hunter" placeholder="ID или имя" style="width: 100%;">
                <span>Кол-во дичи:</span> <input type="text" id="free_count" placeholder="5" style="width: 100%;">
                <span>Особая дичь:</span> <input type="text" id="free_special" placeholder="2 (если есть)" style="width: 100%;">
                <span>Скриншот:</span> <input type="text" id="free_link" placeholder="ссылка" style="width: 100%;">
            </div>
            <button id="free_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
        `;

        div.querySelector('#free_submit').onclick = async () => {
            const dateInput = div.querySelector('#free_date').value;
            const date = dateInput ? formatDateForHunt(dateInput) + '.' : 'дд.мм.гг.';
            const hunter = div.querySelector('#free_hunter').value;
            const count = div.querySelector('#free_count').value || 'n';
            const special = div.querySelector('#free_special').value;
            const link = div.querySelector('#free_link').value || 'ссылка';

            let convertedHunter = '[linkID]';
            let specialLine = '';

            if (hunter) {
                convertedHunter = await convertNamesToIds(hunter);
            }
            if (special) {
                specialLine = `\n[b]Кол-во пойманной особой дичи:[/b] ${special}.`;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Свободная охота[/b]\n[b]Дата:[/b] ${date}\n[b]Охотник:[/b] ${convertedHunter}.\n[b]Кол-во пойманной дичи:[/b] ${count}.${specialLine}\n[b]Подтверждение:[/b] [header=со]скриншот[block=со][img]${link}[/img][/block][/header].`;
                field.focus();
            }
        };

        return div;
    }

    function createHuntCleanForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Чистка куч</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; margin-bottom: 10px;">
                <span>Дата:</span> <input type="date" id="clean_date" value="${getCurrentDateForInput()}" style="width: 100%;">
                <span>Желающий:</span> <input type="text" id="clean_who" placeholder="ID или имя" style="width: 100%;">
            </div>
            <button id="clean_booking_submit" style="width:100%; margin-bottom:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Бронирование</button>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; margin: 10px 0;">
                <span>Чистильщики:</span> <input type="text" id="clean_workers" placeholder="ID или имена через запятую" style="width: 100%;">
            </div>
            <button id="clean_finish_submit" style="width:100%; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Окончание чистки</button>
        `;

        div.querySelector('#clean_booking_submit').onclick = async () => {
            const dateInput = div.querySelector('#clean_date').value;
            const date = dateInput ? formatDateForHunt(dateInput) + '.' : 'дд.мм.гг.';
            const who = div.querySelector('#clean_who').value;

            let convertedWho = '[linkID]';
            if (who) {
                convertedWho = await convertNamesToIds(who);
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Бронирование чистки куч[/b]\n[b]Дата:[/b] ${date}\n[b]Желающий чистить кучу:[/b] ${convertedWho}.`;
                field.focus();
            }
        };

        div.querySelector('#clean_finish_submit').onclick = async () => {
            const dateInput = div.querySelector('#clean_date').value;
            const date = dateInput ? formatDateForHunt(dateInput) + '.' : 'дд.мм.гг.';
            const workers = div.querySelector('#clean_workers').value;

            let convertedWorkers = '[linkID]';
            if (workers) {
                convertedWorkers = await convertNamesToIds(workers);
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Чистка куч[/b]\n[b]Дата:[/b] ${date}\n[b]Чистильщики:[/b] ${convertedWorkers}.`;
                field.focus();
            }
        };

        return div;
    }

    function createHuntActiveForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Активная охота</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; margin-bottom: 10px;">
                <span>Дата:</span> <input type="date" id="active_date" value="${getCurrentDateForInput()}" style="width: 100%;">
                <span>Время:</span> <input type="text" id="active_time" placeholder="12:00" style="width: 100%;">
                <span>Собирающий:</span> <input type="text" id="active_leader" placeholder="ID или имя" style="width: 100%;">
            </div>
            <button id="active_booking_submit" style="width:100%; margin-bottom:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Бронирование</button>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center; margin: 10px 0;">
                <span>Боевая команда:</span> <input type="text" id="active_team" placeholder="ID или имена через запятую" style="width: 100%;">
            </div>
            <button id="active_finish_submit" style="width:100%; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Окончание охоты</button>
        `;

        div.querySelector('#active_booking_submit').onclick = async () => {
            const dateInput = div.querySelector('#active_date').value;
            const date = dateInput ? formatDateForHunt(dateInput) : 'дд.мм.гг';
            const time = div.querySelector('#active_time').value || '00:00';
            const leader = div.querySelector('#active_leader').value;

            let convertedLeader = '[linkID]';
            if (leader) {
                convertedLeader = await convertNamesToIds(leader);
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Бронирование активной охоты[/b]\n[b]Дата и время:[/b] ${date} - ${time}.\n[b]Собирающий:[/b] ${convertedLeader}.`;
                field.focus();
            }
        };

        div.querySelector('#active_finish_submit').onclick = async () => {
            const dateInput = div.querySelector('#active_date').value;
            const date = dateInput ? formatDateForHunt(dateInput) : 'дд.мм.гг';
            const time = div.querySelector('#active_time').value || '00:00';
            const team = div.querySelector('#active_team').value;

            let convertedTeam = '[linkID], [linkID], [linkID], [linkID]';
            if (team) {
                convertedTeam = await convertNamesToIds(team);
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Активная охота[/b]\n[b]Дата и время:[/b] ${date} - ${time}.\n[b]Боевая команда:[/b] ${convertedTeam}.`;
                field.focus();
            }
        };

        return div;
    }

    function createHuntCatchForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Улов со дна и расщелин</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Добытчик:</span> <input type="text" id="catch_hunter" placeholder="ID или имя" style="width: 100%;">
            <span>Кол-во:</span> <input type="text" id="catch_count" placeholder="5" style="width: 100%;">
            <span>Скриншот:</span> <input type="text" id="catch_link" placeholder="ссылка" style="width: 100%;">
        </div>
        <button id="catch_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#catch_submit').onclick = async () => {
            const hunter = div.querySelector('#catch_hunter').value;
            const count = div.querySelector('#catch_count').value || 'n';
            const link = div.querySelector('#catch_link').value || 'ссылка';

            let convertedHunter = '[linkID]';
            let rawId = 'ID';

            if (hunter) {
                convertedHunter = await convertNamesToIds(hunter);
                const idMatch = convertedHunter.match(/\[link(\d+)\]/);
                if (idMatch) {
                    rawId = idMatch[1];
                } else {
                    const nameMatch = hunter.match(/\d+/);
                    if (nameMatch) {
                        rawId = nameMatch[0];
                    }
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Улов[/b]\n[b]Добытчик (кол-во пойманного):[/b] ${convertedHunter} [${rawId}] (${count})\n[b]Подтверждение:[/b] [header=улов]скриншот[block=улов][img]${link}[/img][/block][/header].`;
                field.focus();
            }
        };

        return div;
    }

    function createPuForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Повышение уровня ПУ</div>
            <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; align-items: center;">
                <span>ID/имя:</span> <input type="text" id="pu_id" placeholder="ID или имя" style="width: 100%;">
                <span>Уровень:</span> <input type="text" id="pu_level" placeholder="8" style="width: 100%;">
                <span>Скриншот:</span> <input type="text" id="pu_link" placeholder="ссылка" style="width: 100%;">
            </div>
            <button id="pu_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
        `;

        div.querySelector('#pu_submit').onclick = async () => {
            const id = div.querySelector('#pu_id').value;
            const level = div.querySelector('#pu_level').value || 'n';
            const link = div.querySelector('#pu_link').value || 'ссылка';

            let convertedId = '[[n]link[/n]ID]';
            if (id) {
                convertedId = await convertNamesToIds(id);
                convertedId = convertedId.replace('[link', '[[n]link[/n]');
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `Я, ${convertedId}, повысил свой уровень ПУ до ${level}. [[url=${link}]Скриншот-подтверждение[/url]]`;
                field.focus();
            }
        };

        return div;
    }

    function createHealForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Повышение количества доступных лечений</div>
            <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; align-items: center;">
                <span>ID/имя:</span> <input type="text" id="heal_id" placeholder="ID или имя" style="width: 100%;">
                <span>Скриншот:</span> <input type="text" id="heal_link" placeholder="ссылка" style="width: 100%;">
            </div>
            <button id="heal_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
        `;

        div.querySelector('#heal_submit').onclick = async () => {
            const id = div.querySelector('#heal_id').value;
            const link = div.querySelector('#heal_link').value || 'ссылка';

            let convertedId = '[[n]link[/n]ID]';
            if (id) {
                convertedId = await convertNamesToIds(id);
                convertedId = convertedId.replace('[link', '[[n]link[/n]');
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `Я, ${convertedId}, желаю повысить количество доступных мне лечений. [[url=${link}]Скриншот УЗ[/url]]`;
                field.focus();
            }
        };

        return div;
    }

    function createPatrolForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;

        const timeOptions = PATROL_TIMES.map(t => `<option value="${t}" ${t === '12:30' ? 'selected' : ''}>${t}</option>`).join('');

        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Водный патруль</div>
            <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px; align-items: center;">
                <span>Дата:</span> <input type="date" id="patrol_date" value="${getCurrentDateForInput()}" style="width: 100%;">
                <span>Время:</span> <select id="patrol_time" style="width: 100%;">${timeOptions}</select>
                <span>Собирающий:</span> <input type="text" id="patrol_collector" placeholder="ID или имя" style="width: 100%;">
                <span>Ведущий 2 части:</span> <input type="text" id="patrol_coleader" placeholder="ID, имя или —" style="width: 100%;">
                <span>Участники:</span> <input type="text" id="patrol_participants" placeholder="ID или имена через запятую" style="width: 100%;">
                <span>Нарушения:</span> <input type="text" id="patrol_violations" placeholder="если нет, оставьте пустым" style="width: 100%;">
                <span>Скриншот:</span> <input type="text" id="patrol_link" placeholder="если есть нарушения" style="width: 100%;">
            </div>
            <button id="patrol_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
        `;

        div.querySelector('#patrol_submit').onclick = async () => {
            const dateInput = div.querySelector('#patrol_date').value;
            const date = dateInput ? formatDateForReport(dateInput) : 'дд.мм.гг';
            const time = div.querySelector('#patrol_time').value;

            const collector = div.querySelector('#patrol_collector').value;
            const coleader = div.querySelector('#patrol_coleader').value;
            const participants = div.querySelector('#patrol_participants').value;
            let violations = div.querySelector('#patrol_violations').value;
            const link = div.querySelector('#patrol_link').value;

            let convertedCollector = '[linkID]';
            let convertedColeader = '[linkID]';
            let convertedParticipants = '[linkID], [linkID]';

            if (collector) {
                convertedCollector = await convertNamesToIds(collector);
            }
            if (coleader) {
                if (coleader === '—') {
                    convertedColeader = '—';
                } else {
                    convertedColeader = await convertNamesToIds(coleader);
                }
            }
            if (participants) {
                convertedParticipants = await convertNamesToIds(participants);
            }

            if (!violations) {
                violations = getRandomViolation();
            }

            let result = `[b]Водный патруль[/b]\n[b]Дата[/b]: ${date};\n[b]Время[/b]: ${time};\n[b]Собирающий[/b]: ${convertedCollector};\n[b]Ведущий второй части[/b]: ${convertedColeader};\n[b]Участники[/b]: ${convertedParticipants};\n[b]Нарушения[/b]: ${violations}`;
            if (link) {
                result += ` [url=${link}]скриншот[/url]`;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = result;
                field.focus();
            }
        };

        return div;
    }

    function createCarryForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Ношение котов на дно</div>
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 8px; align-items: center;">
            <span>Носильщик:</span> <input type="text" id="carry_carrier" placeholder="ID или имя" style="width: 100%;">
            <span>Кого несли:</span> <input type="text" id="carry_carried" placeholder="ID или имя" style="width: 100%;">
            <span>Кол-во раз:</span> <input type="text" id="carry_times" placeholder="3" style="width: 100%;">
            <span>Скриншот:</span> <input type="text" id="carry_link" placeholder="ссылка" style="width: 100%;">
        </div>
        <button id="carry_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#carry_submit').onclick = async () => {
            const carrier = div.querySelector('#carry_carrier').value;
            const carried = div.querySelector('#carry_carried').value;
            const times = div.querySelector('#carry_times').value || 'n';
            const link = div.querySelector('#carry_link').value;

            let convertedCarrier = '[[n]link[/n]ID]';
            let convertedCarried = '[linkID]';

            if (carrier) {
                convertedCarrier = await convertNamesToIds(carrier);
                convertedCarrier = convertedCarrier.replace('[link', '[[n]link[/n]');
            }
            if (carried) {
                convertedCarried = await convertNamesToIds(carried);
            }

            const field = document.querySelector('#comment');
            if (field) {
                let result = `Я, ${convertedCarrier}, относил игрока ${convertedCarried} на дно ${times} раз.`;
                if (link) {
                    result += ` [url=${link}]Подтверждение[/url]`;
                }
                field.value = result;
                field.focus();
            }
        };

        return div;
    }

    function createCleanReportForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Отчёт о чистке</div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center;">
            <span>Чистильщик:</span> <input type="text" id="clean_report_who" placeholder="ID или имя" style="width: 100%;">
            <span>Кол-во убранных:</span> <input type="text" id="clean_report_count" placeholder="n" style="width: 100%;">
            <span>Доказательство (скриншоты):</span> <input type="text" id="clean_report_link" placeholder="ссылка1, ссылка2" style="width: 100%;">
        </div>
        <button id="clean_report_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#clean_report_submit').onclick = async () => {
            const who = div.querySelector('#clean_report_who').value;
            const count = div.querySelector('#clean_report_count').value || 'n';
            const links = div.querySelector('#clean_report_link').value;

            let convertedWho = 'ID';
            if (who) {
                const converted = await convertNamesToIds(who);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedWho = idMatch ? idMatch[1] : who;
            }

            let proofText = '[url=ссылка]скриншот[/url]';
            if (links) {
                const linkArray = links.split(',').map(l => l.trim()).filter(l => l);

                if (linkArray.length === 1) {
                    proofText = `[url=${linkArray[0]}]скриншот[/url]`;
                } else if (linkArray.length > 1) {
                    proofText = linkArray.map((link, index) => `[url=${link}]скриншот ${index + 1}[/url]`).join(', ');
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Чистильщик:[/b] [${convertedWho}];\n[b]Кол-во убранных:[/b] ${count};\n[b]Доказательство:[/b] ${proofText}.`;
                field.focus();
            }
        };

        return div;
    }

    function createCleanViolationForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Отпись о нечестной уборке</div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center;">
            <span>Провинившийся:</span> <input type="text" id="violation_who" placeholder="ID или имя" style="width: 100%;">
            <span>Нарушение:</span> <input type="text" id="violation_text" placeholder="какое правило" style="width: 100%;">
            <span>Доказательство (скриншоты):</span> <input type="text" id="violation_link" placeholder="ссылка1, ссылка2" style="width: 100%;">
        </div>
        <button id="violation_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#violation_submit').onclick = async () => {
            const who = div.querySelector('#violation_who').value;
            const violation = div.querySelector('#violation_text').value || 'какое правило было нарушено';
            const links = div.querySelector('#violation_link').value;

            let convertedWho = 'ID';
            let catId = 'catID';

            if (who) {
                const converted = await convertNamesToIds(who);
                const idMatch = converted.match(/\[link(\d+)\]/);
                if (idMatch) {
                    convertedWho = idMatch[1];
                    catId = `cat${idMatch[1]}`;
                } else {
                    convertedWho = who;
                    catId = who;
                }
            }

            let proofText = '[url=ссылка]скриншот[/url]';
            if (links) {
                const linkArray = links.split(',').map(l => l.trim()).filter(l => l);
                if (linkArray.length === 1) {
                    proofText = linkArray[0];
                } else {
                    proofText = linkArray.map((link, index) => `[url=${link}]скриншот ${index + 1}[/url]`).join(', ');
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Провинившийся:[/b] [${catId}] [${convertedWho}];\n[b]Нарушение:[/b] ${violation};\n[b]Доказательство:[/b] ${proofText}.`;
                field.focus();
            }
        };

        return div;
    }

    function createCleanSleepForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Отпись о спящем в неположенном месте</div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center;">
            <span>Нарушитель:</span> <input type="text" id="sleep_who" placeholder="ID или имя" style="width: 100%;">
            <span>Место:</span>
            <select id="sleep_place" style="width: 100%;">
                <option value="Перевал">Перевал</option>
                <option value="Величавый склон">Величавый склон</option>
            </select>
            <span>Скриншот профиля:</span> <input type="text" id="sleep_profile" placeholder="ссылка" style="width: 100%;">
            <span>Скриншот игровой:</span> <input type="text" id="sleep_game" placeholder="ссылка" style="width: 100%;">
            <span>ID зафиксировавшего:</span> <input type="text" id="sleep_reporter" placeholder="ID или имя" style="width: 100%;">
        </div>
        <button id="sleep_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#sleep_submit').onclick = async () => {
            const who = div.querySelector('#sleep_who').value;
            const place = div.querySelector('#sleep_place').value;
            const profileLink = div.querySelector('#sleep_profile').value;
            const gameLink = div.querySelector('#sleep_game').value;
            const reporter = div.querySelector('#sleep_reporter').value;

            let convertedWho = 'ID';
            let catId = 'catID';

            if (who) {
                const converted = await convertNamesToIds(who);
                const idMatch = converted.match(/\[link(\d+)\]/);
                if (idMatch) {
                    convertedWho = idMatch[1];
                    catId = `cat${idMatch[1]}`;
                } else {
                    convertedWho = who;
                    catId = who;
                }
            }

            let convertedReporter = 'ID';
            if (reporter) {
                const converted = await convertNamesToIds(reporter);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedReporter = idMatch ? idMatch[1] : reporter;
            }

            const proofParts = [];
            if (profileLink) {
                proofParts.push(`[url=${profileLink}]профиль[/url]`);
            } else {
                proofParts.push(`[url=ссылка]профиль[/url]`);
            }
            if (gameLink) {
                proofParts.push(`[url=${gameLink}]игровая[/url]`);
            } else {
                proofParts.push(`[url=ссылка]игровая[/url]`);
            }
            const proofText = proofParts.join(', ');

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[${catId}] [${convertedWho}] ушёл из игры в неположенном месте: ${place};\n[b]Доказательство:[/b] ${proofText};\n[b]ID зафиксировавшего нарушение:[/b] ${convertedReporter}.`;
                field.focus();
            }
        };

        return div;
    }

    function createCleanSleepCleanForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Отпись об уборке заснувшего</div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center;">
            <span>Убранный:</span> <input type="text" id="sleepclean_who" placeholder="ID или имя" style="width: 100%;">
            <span>Место:</span>
            <select id="sleepclean_place" style="width: 100%;">
                <option value="Перевал">Перевал</option>
                <option value="Величавый склон">Величавый склон</option>
            </select>
            <span>Скриншот истории:</span> <input type="text" id="sleepclean_history" placeholder="ссылка" style="width: 100%;">
            <span>Скриншот профиля:</span> <input type="text" id="sleepclean_profile" placeholder="ссылка" style="width: 100%;">
            <span>Скриншот игровой:</span> <input type="text" id="sleepclean_game" placeholder="ссылка" style="width: 100%;">
            <span>ID зафиксировавшего:</span> <input type="text" id="sleepclean_reporter" placeholder="ID или имя" style="width: 100%;">
        </div>
        <button id="sleepclean_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#sleepclean_submit').onclick = async () => {
            const who = div.querySelector('#sleepclean_who').value;
            const place = div.querySelector('#sleepclean_place').value;
            const historyLink = div.querySelector('#sleepclean_history').value;
            const profileLink = div.querySelector('#sleepclean_profile').value;
            const gameLink = div.querySelector('#sleepclean_game').value;
            const reporter = div.querySelector('#sleepclean_reporter').value;

            let convertedWho = 'ID';
            let catId = 'catID';

            if (who) {
                const converted = await convertNamesToIds(who);
                const idMatch = converted.match(/\[link(\d+)\]/);
                if (idMatch) {
                    convertedWho = idMatch[1];
                    catId = `cat${idMatch[1]}`;
                } else {
                    convertedWho = who;
                    catId = who;
                }
            }

            let convertedReporter = 'ID';
            if (reporter) {
                const converted = await convertNamesToIds(reporter);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedReporter = idMatch ? idMatch[1] : reporter;
            }

            const proofParts = [];
            if (historyLink) {
                proofParts.push(`[url=${historyLink}]история[/url]`);
            } else {
                proofParts.push(`[url=ссылка]история[/url]`);
            }
            if (profileLink) {
                proofParts.push(`[url=${profileLink}]профиль[/url]`);
            } else {
                proofParts.push(`[url=ссылка]профиль[/url]`);
            }
            if (gameLink) {
                proofParts.push(`[url=${gameLink}]игровая[/url]`);
            } else {
                proofParts.push(`[url=ссылка]игровая[/url]`);
            }
            const proofText = proofParts.join(', ');

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[${catId}] [${convertedWho}] ушёл из игры в неположенном месте: ${place}.\n[b]Доказательство[/b] ${proofText};\n[b]ID зафиксировавшего нарушение:[/b] ${convertedReporter}.`;
                field.focus();
            }
        };

        return div;
    }

    function createFightPairForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Парная тренировка</div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center;">
            <span>Дата:</span> <input type="date" id="pair_date" value="${getCurrentDateForInput()}" style="width: 100%;">
            <span>Время начала:</span> <input type="time" id="pair_start" value="12:00" style="width: 100%;" step="60">
            <span>Время окончания:</span> <input type="time" id="pair_end" value="13:00" style="width: 100%;" step="60">
            <span>Скриншот начала:</span> <input type="text" id="pair_start_link" placeholder="ссылка" style="width: 100%;">
            <span>Скриншот окончания:</span> <input type="text" id="pair_end_link" placeholder="ссылка" style="width: 100%;">
            <span>Большая груша:</span> <input type="text" id="pair_big" placeholder="ID или имя" style="width: 100%;">
            <span>Маленькая груша:</span> <input type="text" id="pair_small" placeholder="ID или имя" style="width: 100%;">
        </div>
        <button id="pair_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#pair_submit').onclick = async () => {
            const dateInput = div.querySelector('#pair_date').value;
            const date = dateInput ? formatDateForHunt(dateInput) : 'дд.мм.гг';
            const start = div.querySelector('#pair_start').value || 'nn:nn';
            const end = div.querySelector('#pair_end').value || 'nn:nn';
            const startLink = div.querySelector('#pair_start_link').value || 'ссылка';
            const endLink = div.querySelector('#pair_end_link').value || 'ссылка';
            const big = div.querySelector('#pair_big').value;
            const small = div.querySelector('#pair_small').value;

            let convertedBig = '[linkID]';
            let convertedSmall = '[linkID]';

            if (big) {
                convertedBig = await convertNamesToIds(big);
            }
            if (small) {
                convertedSmall = await convertNamesToIds(small);
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Парное грушевание.[/b]\n[b]Дата:[/b] ${date};\n[b]Временной промежуток:[/b] ${start}-${end} [скриншот со временем [url=${startLink}]начала[/url] и [url=${endLink}]окончания[/url] грушевания];\n[b]Большая груша:[/b] ${convertedBig};\n[b]Маленькая груша:[/b] ${convertedSmall}.`;
                field.focus();
            }
        };

        return div;
    }

    function createFightPairMultiForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Парная тренировка (несколько груш)</div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center; margin-bottom: 10px;">
            <span>Дата:</span> <input type="date" id="multipair_date" value="${getCurrentDateForInput()}" style="width: 100%;">
        </div>

        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin: 10px 0; font-weight: bold;">Большие груши</div>
        <div id="big_pears_container"></div>
        <button id="add_big_pear" style="margin: 10px 0; padding: 4px 8px; background:${COLORS.bgAccent}; color:${COLORS.textDark}; border:none; cursor:pointer;">➕ Добавить большую грушу</button>

        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin: 10px 0; font-weight: bold;">Маленькие груши</div>
        <div id="small_pears_container"></div>
        <button id="add_small_pear" style="margin: 10px 0; padding: 4px 8px; background:${COLORS.bgAccent}; color:${COLORS.textDark}; border:none; cursor:pointer;">➕ Добавить маленькую грушу</button>

        <button id="multipair_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        function createBigPearRow(value = '') {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.style.marginBottom = '8px';
            row.style.alignItems = 'center';
            row.innerHTML = `
            <input type="text" class="big_pear_input" placeholder="ID или имя" value="${value}" style="flex: 1;">
            <button class="remove_pear" style="background:${COLORS.warning}; color:white; border:none; cursor:pointer; padding:2px 8px;">✕</button>
        `;
            row.querySelector('.remove_pear').onclick = () => row.remove();
            return row;
        }

        function createSmallPearRow() {
            const row = document.createElement('div');
            row.style.display = 'grid';
            row.style.gridTemplateColumns = '100px 100px 1fr auto';
            row.style.gap = '8px';
            row.style.marginBottom = '8px';
            row.innerHTML = `
            <input type="time" class="small_start" value="12:00" style="width: 100%;" step="60">
            <input type="time" class="small_end" value="13:00" style="width: 100%;" step="60">
            <input type="text" class="small_link" placeholder="ссылка" style="width: 100%;">
            <button class="remove_pear" style="background:${COLORS.warning}; color:white; border:none; cursor:pointer; padding:2px 8px;">✕</button>
        `;
            row.querySelector('.remove_pear').onclick = () => row.remove();
            return row;
        }

        const bigContainer = div.querySelector('#big_pears_container');
        const smallContainer = div.querySelector('#small_pears_container');

        div.querySelector('#add_big_pear').onclick = (e) => {
            e.preventDefault();
            bigContainer.appendChild(createBigPearRow());
        };

        div.querySelector('#add_small_pear').onclick = (e) => {
            e.preventDefault();
            smallContainer.appendChild(createSmallPearRow());
        };

        bigContainer.appendChild(createBigPearRow());

        div.querySelector('#multipair_submit').onclick = async () => {
            const dateInput = div.querySelector('#multipair_date').value;
            const date = dateInput ? formatDateForHunt(dateInput) : 'дд.мм.гг';

            const bigInputs = div.querySelectorAll('#big_pears_container .big_pear_input');
            const bigPromises = Array.from(bigInputs).map(input => {
                const val = input.value.trim();
                return val ? convertNamesToIds(val) : Promise.resolve('');
            });
            const bigResults = await Promise.all(bigPromises);
            const bigList = bigResults.filter(id => id).join(', ');

            const smallRows = div.querySelectorAll('#small_pears_container .small_start');
            const smallEntries = [];
            for (let i = 0; i < smallRows.length; i++) {
                const row = smallRows[i].closest('.small-pear-row') || smallRows[i].parentElement;
                const start = row.querySelector('.small_start')?.value || 'nn:nn';
                const end = row.querySelector('.small_end')?.value || 'nn:nn';
                const link = row.querySelector('.small_link')?.value || 'ссылка';
                smallEntries.push(`[url=${link}]${start}[/url]-[url=${link}]${end}[/url]`);
            }

            const field = document.querySelector('#comment');
            if (field) {
                let result = `[b]Парное грушевание.[/b]\n[b]Дата:[/b] ${date};\n`;
                if (bigList) {
                    result += `[b]Большая груша:[/b] ${bigList};\n`;
                }
                if (smallEntries.length > 0) {
                    result += `[b]Маленькая груша:[/b] ${smallEntries.join(', ')};\n`;
                }
                field.value = result;
                field.focus();
            }
        };

        return div;
    }

    function createFightSoloForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Одиночная тренировка</div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center;">
            <span>Дата:</span> <input type="date" id="solo_date" value="${getCurrentDateForInput()}" style="width: 100%;">
            <span>Время начала:</span> <input type="time" id="solo_start" value="12:00" style="width: 100%;" step="60">
            <span>Время окончания:</span> <input type="time" id="solo_end" value="13:00" style="width: 100%;" step="60">
            <span>Скриншот начала:</span> <input type="text" id="solo_start_link" placeholder="ссылка" style="width: 100%;">
            <span>Скриншот окончания:</span> <input type="text" id="solo_end_link" placeholder="ссылка" style="width: 100%;">
            <span>Грушующий:</span> <input type="text" id="solo_fighter" placeholder="ID или имя" style="width: 100%;">
        </div>
        <button id="solo_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#solo_submit').onclick = async () => {
            const dateInput = div.querySelector('#solo_date').value;
            const date = dateInput ? formatDateForHunt(dateInput) : 'дд.мм.гг';
            const start = div.querySelector('#solo_start').value || 'nn:nn';
            const end = div.querySelector('#solo_end').value || 'nn:nn';
            const startLink = div.querySelector('#solo_start_link').value || 'ссылка';
            const endLink = div.querySelector('#solo_end_link').value || 'ссылка';
            const fighter = div.querySelector('#solo_fighter').value;

            let convertedFighter = '[linkID]';
            if (fighter) {
                convertedFighter = await convertNamesToIds(fighter);
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Одиночное грушевание.[/b]\n[b]Дата:[/b] ${date};\n[b]Временной промежуток:[/b] ${start}-${end} [скриншот со временем [url=${startLink}]начала[/url] и [url=${endLink}]окончания[/url] грушевания];\n[b]Грушующий:[/b] ${convertedFighter}.`;
                field.focus();
            }
        };

        return div;
    }

    function createFightBookingForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Бронирование грушевания</div>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center;">
            <span>День:</span> <input type="text" id="booking_day" placeholder="дд.мм" style="width: 100%;">
            <span>Время начала:</span> <input type="time" id="booking_start" value="12:00" style="width: 100%;" step="60">
            <span>Время окончания:</span> <input type="time" id="booking_end" value="13:00" style="width: 100%;" step="60">
        </div>
        <button id="booking_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#booking_submit').onclick = () => {
            const day = div.querySelector('#booking_day').value || 'нн.нн';
            const start = div.querySelector('#booking_start').value || 'нн:нн';
            const end = div.querySelector('#booking_end').value || 'нн:нн';

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Бронирование грушевания[/b]\nДень: ${day}\nВремя ${start} — ${end}.`;
                field.focus();
            }
        };

        return div;
    }

    function createAutoTab() {
        const div = document.createElement('div');
        div.className = 'auto-tab';
        div.style.padding = '10px';

        const sections = [];

        if (isPlovcy) {
            sections.push(
                { title: 'Повышение уровня ПУ', form: createPuForm() },
                { title: 'Повышение количества доступных лечений', form: createHealForm() },
                { title: 'Водный патруль', form: createPatrolForm() },
                { title: 'Ношение котов на дно', form: createCarryForm() }
            );
        }

        if (isGuard) {
            const adultHeader = document.createElement('div');
            adultHeader.style.cssText = `
        background-color: ${COLORS.bgMain};
        color: ${COLORS.textLight};
        padding: 8px;
        margin: 5px 0;
        cursor: pointer;
        border-radius: 4px;
        font-weight: bold;
        text-align: center;
    `;
            adultHeader.textContent = 'Взрослая деятельность';

            const adultContainer = document.createElement('div');
            adultContainer.style.display = 'none';
            adultContainer.style.padding = '10px';
            adultContainer.style.backgroundColor = COLORS.bgLight;
            adultContainer.style.border = '1px solid ' + COLORS.border;
            adultContainer.style.borderRadius = '4px';
            adultContainer.style.marginBottom = '10px';

            const adultSections = [
                { title: 'Плановый патруль', form: createGuardPlannedForm() },
                { title: 'Свободный патруль', form: createGuardFreeForm() },
                { title: 'Начало дозора', form: createGuardStartForm() },
                { title: 'Отчёт дозора', form: createGuardReportForm() }
            ];

            adultSections.forEach(s => {
                const header = document.createElement('div');
                header.style.cssText = `
            background-color: ${COLORS.bgAccent};
            color: ${COLORS.textDark};
            padding: 6px;
            margin: 3px 0;
            cursor: pointer;
            border-radius: 4px;
            font-weight: bold;
            text-align: center;
            font-size: 13px;
        `;
                header.textContent = s.title;
                s.form.style.display = 'none';
                header.onclick = () => {
                    s.form.style.display = s.form.style.display === 'none' ? 'block' : 'none';
                };
                adultContainer.appendChild(header);
                adultContainer.appendChild(s.form);
            });

            div.appendChild(adultHeader);
            div.appendChild(adultContainer);

            adultHeader.onclick = () => {
                adultContainer.style.display = adultContainer.style.display === 'none' ? 'block' : 'none';
            };

            const childHeader = document.createElement('div');
            childHeader.style.cssText = `
        background-color: ${COLORS.bgMain};
        color: ${COLORS.textLight};
        padding: 8px;
        margin: 5px 0;
        cursor: pointer;
        border-radius: 4px;
        font-weight: bold;
        text-align: center;
    `;
            childHeader.textContent = 'Детская деятельность';

            const childContainer = document.createElement('div');
            childContainer.style.display = 'none';
            childContainer.style.padding = '10px';
            childContainer.style.backgroundColor = COLORS.bgLight;
            childContainer.style.border = '1px solid ' + COLORS.border;
            childContainer.style.borderRadius = '4px';
            childContainer.style.marginBottom = '10px';

            const childSections = [
                { title: 'Детский патруль', form: createGuardChildPatrolForm() },
                { title: 'Начало детского дозора', form: createGuardChildStartForm() },
                { title: 'Отчёт детского дозора', form: createGuardChildReportForm() }
            ];

            childSections.forEach(s => {
                const header = document.createElement('div');
                header.style.cssText = `
            background-color: ${COLORS.bgAccent};
            color: ${COLORS.textDark};
            padding: 6px;
            margin: 3px 0;
            cursor: pointer;
            border-radius: 4px;
            font-weight: bold;
            text-align: center;
            font-size: 13px;
        `;
                header.textContent = s.title;
                s.form.style.display = 'none';
                header.onclick = () => {
                    s.form.style.display = s.form.style.display === 'none' ? 'block' : 'none';
                };
                childContainer.appendChild(header);
                childContainer.appendChild(s.form);
            });

            div.appendChild(childHeader);
            div.appendChild(childContainer);

            childHeader.onclick = () => {
                childContainer.style.display = childContainer.style.display === 'none' ? 'block' : 'none';
            };

            const achievementHeader = document.createElement('div');
            achievementHeader.style.cssText = `
        background-color: ${COLORS.bgMain};
        color: ${COLORS.textLight};
        padding: 8px;
        margin: 5px 0;
        cursor: pointer;
        border-radius: 4px;
        font-weight: bold;
        text-align: center;
    `;
            achievementHeader.textContent = 'Ачивки';

            const achievementContainer = document.createElement('div');
            achievementContainer.style.display = 'none';
            achievementContainer.style.padding = '10px';
            achievementContainer.style.backgroundColor = COLORS.bgLight;
            achievementContainer.style.border = '1px solid ' + COLORS.border;
            achievementContainer.style.borderRadius = '4px';
            achievementContainer.style.marginBottom = '10px';

            const achievementSections = [
                { title: 'Получение ачивки', form: createGuardAchievementForm() },
                { title: 'Начало задания', form: createGuardTaskStartForm() },
                { title: 'Завершение задания', form: createGuardTaskCompleteForm() }
            ];

            achievementSections.forEach(s => {
                const header = document.createElement('div');
                header.style.cssText = `
            background-color: ${COLORS.bgAccent};
            color: ${COLORS.textDark};
            padding: 6px;
            margin: 3px 0;
            cursor: pointer;
            border-radius: 4px;
            font-weight: bold;
            text-align: center;
            font-size: 13px;
        `;
                header.textContent = s.title;
                s.form.style.display = 'none';
                header.onclick = () => {
                    s.form.style.display = s.form.style.display === 'none' ? 'block' : 'none';
                };
                achievementContainer.appendChild(header);
                achievementContainer.appendChild(s.form);
            });

            div.appendChild(achievementHeader);
            div.appendChild(achievementContainer);

            achievementHeader.onclick = () => {
                achievementContainer.style.display = achievementContainer.style.display === 'none' ? 'block' : 'none';
            };
        }

        if (isHunt) {
            sections.push(
                { title: 'Охотничий патруль', form: createHuntPatrolForm() },
                { title: 'Свободная охота', form: createHuntFreeForm() },
                { title: 'Чистка куч', form: createHuntCleanForm() },
                { title: 'Активная охота', form: createHuntActiveForm() },
                { title: 'Улов со дна и расщелин', form: createHuntCatchForm() }
            );
        }

        if (isClean) {
            sections.push(
                { title: 'Отчёт о чистке', form: createCleanReportForm() },
                { title: 'Отпись о нечестной уборке', form: createCleanViolationForm() },
                { title: 'Отпись о спящем в неположенном месте', form: createCleanSleepForm() },
                { title: 'Отпись об уборке заснувшего', form: createCleanSleepCleanForm() }
            );
        }

        if (isFight) {
            sections.push(
                { title: 'Парная тренировка', form: createFightPairForm() },
                { title: 'Парная тренировка (несколько груш)', form: createFightPairMultiForm() },
                { title: 'Одиночная тренировка', form: createFightSoloForm() },
                { title: 'Бронирование грушевания', form: createFightBookingForm() }
            );
        }

        if (isKitten) {
            const kittenHeader = document.createElement('div');
            kittenHeader.style.cssText = `
        background-color: ${COLORS.bgMain};
        color: ${COLORS.textLight};
        padding: 8px;
        margin: 5px 0;
        cursor: pointer;
        border-radius: 4px;
        font-weight: bold;
        text-align: center;
    `;
            kittenHeader.textContent = 'Для котят';

            const kittenContainer = document.createElement('div');
            kittenContainer.style.display = 'none';
            kittenContainer.style.padding = '10px';
            kittenContainer.style.backgroundColor = COLORS.bgLight;
            kittenContainer.style.border = '1px solid ' + COLORS.border;
            kittenContainer.style.borderRadius = '4px';
            kittenContainer.style.marginBottom = '10px';

            const kittenSections = [
                { title: 'Получение ачивки', form: createAchievementForm() },
                { title: 'Получение ледяшек за медаль', form: createMedalForm() },
                { title: 'Отчёт о свободной охоте', form: createButterflyForm() },
                { title: 'Активация бабочки', form: createActivationForm() },
                { title: 'Получение навыков', form: createSkillForm() },
                { title: 'Полезный ресурс со дна/расщелины', form: createResourceForm() }
            ];

            kittenSections.forEach(s => {
                const header = document.createElement('div');
                header.style.cssText = `
            background-color: ${COLORS.bgAccent};
            color: ${COLORS.textDark};
            padding: 6px;
            margin: 3px 0;
            cursor: pointer;
            border-radius: 4px;
            font-weight: bold;
            text-align: center;
            font-size: 13px;
        `;
                header.textContent = s.title;
                s.form.style.display = 'none';
                header.onclick = () => {
                    s.form.style.display = s.form.style.display === 'none' ? 'block' : 'none';
                };
                kittenContainer.appendChild(header);
                kittenContainer.appendChild(s.form);
            });

            div.appendChild(kittenHeader);
            div.appendChild(kittenContainer);

            kittenHeader.onclick = () => {
                kittenContainer.style.display = kittenContainer.style.display === 'none' ? 'block' : 'none';
            };

            const keeperHeader = document.createElement('div');
            keeperHeader.style.cssText = `
        background-color: ${COLORS.bgMain};
        color: ${COLORS.textLight};
        padding: 8px;
        margin: 5px 0;
        cursor: pointer;
        border-radius: 4px;
        font-weight: bold;
        text-align: center;
    `;
            keeperHeader.textContent = 'Для хранителей очага';

            const keeperContainer = document.createElement('div');
            keeperContainer.style.display = 'none';
            keeperContainer.style.padding = '10px';
            keeperContainer.style.backgroundColor = COLORS.bgLight;
            keeperContainer.style.border = '1px solid ' + COLORS.border;
            keeperContainer.style.borderRadius = '4px';
            keeperContainer.style.marginBottom = '10px';

            const keeperSections = [
                { title: 'Активация бабочки', form: createKeeperActivationForm() },
                { title: 'Создание игрушек', form: createToyForm() },
                { title: 'Проведение вечера сказок', form: createStoryForm() },
                { title: 'Проведение охотничьего турнира', form: createTournamentForm() },
                { title: 'Сопровождение котёнка на Дрейфующие льды', form: createWateringForm() },
                { title: 'Вылазка', form: createExcursionForm() }
            ];

            keeperSections.forEach(s => {
                const header = document.createElement('div');
                header.style.cssText = `
            background-color: ${COLORS.bgAccent};
            color: ${COLORS.textDark};
            padding: 6px;
            margin: 3px 0;
            cursor: pointer;
            border-radius: 4px;
            font-weight: bold;
            text-align: center;
            font-size: 13px;
        `;
                header.textContent = s.title;
                s.form.style.display = 'none';
                header.onclick = () => {
                    s.form.style.display = s.form.style.display === 'none' ? 'block' : 'none';
                };
                keeperContainer.appendChild(header);
                keeperContainer.appendChild(s.form);
            });

            div.appendChild(keeperHeader);
            div.appendChild(keeperContainer);

            keeperHeader.onclick = () => {
                keeperContainer.style.display = keeperContainer.style.display === 'none' ? 'block' : 'none';
            };

            const nestHeader = document.createElement('div');
            nestHeader.style.cssText = `
        background-color: ${COLORS.bgMain};
        color: ${COLORS.textLight};
        padding: 8px;
        margin: 5px 0;
        cursor: pointer;
        border-radius: 4px;
        font-weight: bold;
        text-align: center;
    `;
            nestHeader.textContent = 'Для гнёздышка';

            const nestContainer = document.createElement('div');
            nestContainer.style.display = 'none';
            nestContainer.style.padding = '10px';
            nestContainer.style.backgroundColor = COLORS.bgLight;
            nestContainer.style.border = '1px solid ' + COLORS.border;
            nestContainer.style.borderRadius = '4px';
            nestContainer.style.marginBottom = '10px';

            const nestSections = [
                { title: 'Обновление информации о семье', form: createFamilyUpdateForm() },
                { title: 'Выпуск котёнка', form: createGraduateForm() },
                { title: 'Пополнение в семье', form: createFamilyAddForm() }
            ];

            nestSections.forEach(s => {
                const header = document.createElement('div');
                header.style.cssText = `
            background-color: ${COLORS.bgAccent};
            color: ${COLORS.textDark};
            padding: 6px;
            margin: 3px 0;
            cursor: pointer;
            border-radius: 4px;
            font-weight: bold;
            text-align: center;
            font-size: 13px;
        `;
                header.textContent = s.title;
                s.form.style.display = 'none';
                header.onclick = () => {
                    s.form.style.display = s.form.style.display === 'none' ? 'block' : 'none';
                };
                nestContainer.appendChild(header);
                nestContainer.appendChild(s.form);
            });

            div.appendChild(nestHeader);
            div.appendChild(nestContainer);

            nestHeader.onclick = () => {
                nestContainer.style.display = nestContainer.style.display === 'none' ? 'block' : 'none';
            };
        }

        sections.forEach(s => {
            const header = document.createElement('div');
            header.style.cssText = `
                background-color: ${COLORS.bgMain};
                color: ${COLORS.textLight};
                padding: 8px;
                margin: 5px 0;
                cursor: pointer;
                border-radius: 4px;
                font-weight: bold;
                text-align: center;
            `;
            header.textContent = s.title;
            s.form.style.display = 'none';
            header.onclick = () => {
                s.form.style.display = s.form.style.display === 'none' ? 'block' : 'none';
            };
            div.appendChild(header);
            div.appendChild(s.form);
        });

        return div;
    }

    function createAchievementForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Получение ачивки</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
                <span>Ваш ID/имя:</span> <input type="text" id="achieve_id" placeholder="ID или имя" style="width: 100%;">
                <span>Название ачивки:</span> <input type="text" id="achieve_name" placeholder="название" style="width: 100%;">
                <span>Выбор шапки:</span>
                <select id="achieve_hat" style="width: 100%;">
                    <option value="">Не выбрано</option>
                    <option value="звезда">звезда</option>
                    <option value="вода">вода</option>
                    <option value="листик">листик</option>
                </select>
                <span>Ссылка на скриншот:</span> <input type="text" id="achieve_link" placeholder="ссылка" style="width: 100%;">
            </div>
            <button id="achieve_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
        `;

        div.querySelector('#achieve_submit').onclick = async () => {
            const id = div.querySelector('#achieve_id').value;
            const name = div.querySelector('#achieve_name').value || 'название';
            const hat = div.querySelector('#achieve_hat').value;
            const link = div.querySelector('#achieve_link').value || 'ссылка';

            let convertedId = 'ID';
            if (id) {
                const converted = await convertNamesToIds(id);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedId = idMatch ? idMatch[1] : id;
            }

            let hatLine = '';
            if (hat) {
                hatLine = `\n[b]Выбор шапки:[/b] ${hat}.`;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Ачивка[/b]\nЯ, ${convertedId}, желаю получить ачивку под названием «${name}».${hatLine}\n[b]Подтверждение:[/b] [url=${link}]скриншот выполненных требований[/url]`;
                field.focus();
            }
        };

        return div;
    }

    function createMedalForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Получение ледяшек за медаль</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
                <span>Ваш ID/имя:</span> <input type="text" id="medal_id" placeholder="ID или имя" style="width: 100%;">
                <span>Название медали:</span> <input type="text" id="medal_name" placeholder="название" style="width: 100%;">
                <span>Скриншот:</span> <input type="text" id="medal_link" placeholder="ссылка" style="width: 100%;">
            </div>
            <button id="medal_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
        `;

        div.querySelector('#medal_submit').onclick = async () => {
            const id = div.querySelector('#medal_id').value;
            const name = div.querySelector('#medal_name').value || 'название';
            const link = div.querySelector('#medal_link').value || 'ссылка';

            let convertedId = 'ID';
            if (id) {
                const converted = await convertNamesToIds(id);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedId = idMatch ? idMatch[1] : id;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Медаль[/b]\nЯ, ${convertedId}, желаю получить 15 ледяшек за медаль под названием «${name}».\n[b]Подтверждение:[/b] [url=${link}]скриншот[/url]`;
                field.focus();
            }
        };

        return div;
    }

    function createButterflyForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Отчёт о свободной охоте (бабочки)</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
                <span>Ваш ID/имя:</span> <input type="text" id="butterfly_id" placeholder="ID или имя" style="width: 100%;">
                <span>Количество бабочек:</span> <input type="text" id="butterfly_count" placeholder="5" style="width: 100%;">
            </div>
            <button id="butterfly_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
        `;

        div.querySelector('#butterfly_submit').onclick = async () => {
            const id = div.querySelector('#butterfly_id').value;
            const count = div.querySelector('#butterfly_count').value || '5';

            let convertedId = 'ID';
            if (id) {
                const converted = await convertNamesToIds(id);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedId = idMatch ? idMatch[1] : id;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Охота[/b]\nЯ, ${convertedId}, словил(а) ${count} бабочек в рамках свободной охоты.`;
                field.focus();
            }
        };

        return div;
    }

    function createActivationForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Активация бабочки</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
                <span>Активирующий:</span> <input type="text" id="act_activator" placeholder="ID или имя" style="width: 100%;">
                <span>Тренирующийся:</span> <input type="text" id="act_trainee" placeholder="ID или имя" style="width: 100%;">
                <span>Количество БУ:</span> <input type="text" id="act_bu" placeholder="150" style="width: 100%;">
            </div>
            <button id="act_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
        `;

        div.querySelector('#act_submit').onclick = async () => {
            const activator = div.querySelector('#act_activator').value;
            const trainee = div.querySelector('#act_trainee').value;
            const bu = div.querySelector('#act_bu').value || 'N';

            let convertedActivator = 'ID';
            let convertedTrainee = 'ID';

            if (activator) {
                const converted = await convertNamesToIds(activator);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedActivator = idMatch ? idMatch[1] : activator;
            }
            if (trainee) {
                const converted = await convertNamesToIds(trainee);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedTrainee = idMatch ? idMatch[1] : trainee;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Детская активация[/b]\n[b]Активирующий:[/b] ${convertedActivator};\n[b]Тренирующийся:[/b] ${convertedTrainee};\n[b]Количество БУ:[/b] ${bu}.`;
                field.focus();
            }
        };

        return div;
    }

    function createKeeperActivationForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Активация</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Активирующий:</span> <input type="text" id="keeper_act_activator" placeholder="ID или имя" style="width: 100%;">
            <span>Тренирующийся:</span> <input type="text" id="keeper_act_trainee" placeholder="ID или имя" style="width: 100%;">
            <span>Количество БУ:</span> <input type="text" id="keeper_act_bu" placeholder="150" style="width: 100%;">
        </div>
        <button id="keeper_act_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#keeper_act_submit').onclick = async () => {
            const activator = div.querySelector('#keeper_act_activator').value;
            const trainee = div.querySelector('#keeper_act_trainee').value;
            const bu = div.querySelector('#keeper_act_bu').value || 'N';

            let convertedActivator = 'ID';
            let convertedTrainee = 'ID';

            if (activator) {
                const converted = await convertNamesToIds(activator);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedActivator = idMatch ? idMatch[1] : activator;
            }
            if (trainee) {
                const converted = await convertNamesToIds(trainee);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedTrainee = idMatch ? idMatch[1] : trainee;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Активация[/b]\n[b]Активирующий:[/b] ${convertedActivator};\n[b]Тренирующийся:[/b] ${convertedTrainee};\n[b]Количество БУ:[/b] ${bu}.`;
                field.focus();
            }
        };

        return div;
    }

    function createSkillForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Получение навыков</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
                <span>Ваш ID/имя:</span> <input type="text" id="skill_id" placeholder="ID или имя" style="width: 100%;">
                <span>Вид навыка:</span>
                <select id="skill_type" style="width: 100%;">
                    <option value="нюх">нюх</option>
                    <option value="копание">копание</option>
                    <option value="боевые умения">боевые умения</option>
                    <option value="плавательные умения">плавательные умения</option>
                    <option value="лазательные умения">лазательные умения</option>
                    <option value="уровень зоркости">уровень зоркости</option>
                    <option value="активность">активность</option>
                </select>
                <span>Уровень навыка:</span>
                <select id="skill_level" style="width: 100%;">
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6+">6+</option>
                    <option value="ЛС">ЛС</option>
                    <option value="ХМ">ХМ</option>
                    <option value="ИИ+">ИИ+</option>
                </select>
                <span>Скриншот:</span> <input type="text" id="skill_link" placeholder="ссылка" style="width: 100%;">
            </div>
            <button id="skill_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
        `;

        div.querySelector('#skill_submit').onclick = async () => {
            const id = div.querySelector('#skill_id').value;
            const type = div.querySelector('#skill_type').value;
            const level = div.querySelector('#skill_level').value;
            const link = div.querySelector('#skill_link').value || 'ссылка';

            let convertedId = 'ID';
            if (id) {
                const converted = await convertNamesToIds(id);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedId = idMatch ? idMatch[1] : id;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Навыки[/b]\nЯ, ${convertedId}, хочу получить ледяшки за прокаченный навык.\n[b]Вид навыка:[/b] ${type}.\n[b]Уровень навыка:[/b] ${level}.\n[b]Подтверждение:[/b] [url=${link}]ссылка на навыки[/url]`;
                field.focus();
            }
        };

        return div;
    }

    function createResourceForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
            <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Полезный ресурс со дна/расщелины</div>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
                <span>Ваш ID/имя:</span> <input type="text" id="resource_id" placeholder="ID или имя" style="width: 100%;">
                <span>Вид ресурса:</span>
                <select id="resource_type" style="width: 100%;">
                    <option value="съедобная дичь">съедобная дичь</option>
                    <option value="водяной мох">водяной мох</option>
                    <option value="обычный мох">обычный мох</option>
                    <option value="паутина">паутина</option>
                    <option value="целебный ресурс">целебный ресурс</option>
                    <option value="камень">камень</option>
                    <option value="ракушка ПУ">ракушка ПУ</option>
                    <option value="ракушка сон">ракушка сон</option>
                    <option value="перья">перья</option>
                </select>
                <span>Ссылка на скриншот:</span> <input type="text" id="resource_link" placeholder="ссылка" style="width: 100%;">
            </div>
            <button id="resource_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
        `;

        div.querySelector('#resource_submit').onclick = async () => {
            const id = div.querySelector('#resource_id').value;
            const type = div.querySelector('#resource_type').value;
            const link = div.querySelector('#resource_link').value || 'ссылка';

            let convertedId = 'ID';
            if (id) {
                const converted = await convertNamesToIds(id);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedId = idMatch ? idMatch[1] : id;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Ресурс[/b]\nЯ, ${convertedId}, хочу получить баллы за выловленный ресурс.\n[b]Вид ресурса:[/b] ${type};\n[b]Подтверждение:[/b] [url=${link}]скриншот[/url]`;
                field.focus();
            }
        };

        return div;
    }

    function createToyForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Создание игрушек</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Ваш ID/имя:</span> <input type="text" id="toy_id" placeholder="ID или имя" style="width: 100%;">
            <span>Сделанные игрушки:</span> <input type="text" id="toy_list" placeholder="название [количество], название [количество]" style="width: 100%;">
            <span>Ссылка на скриншот:</span> <input type="text" id="toy_link" placeholder="ссылка" style="width: 100%;">
        </div>
        <button id="toy_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#toy_submit').onclick = async () => {
            const id = div.querySelector('#toy_id').value;
            const list = div.querySelector('#toy_list').value || 'название [количество]';
            const link = div.querySelector('#toy_link').value || 'ссылка';

            let convertedId = 'ID';
            if (id) {
                const converted = await convertNamesToIds(id);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedId = idMatch ? idMatch[1] : id;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Игрушки[/b]\nЯ, ${convertedId}, сделал(а) игрушки из подручных материалов для наших малышей.\n[b]Сделанные игрушки:[/b] ${list};\n[b]Подтверждение:[/b] [url=${link}]скриншот[/url].`;
                field.focus();
            }
        };

        return div;
    }

    function createStoryForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Проведение вечера сказок</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Дата:</span> <input type="date" id="story_date" value="${getCurrentDateForInput()}" style="width: 100%;">
            <span>Время:</span> <input type="time" id="story_time" value="14:00" style="width: 100%;" step="60">
            <span>Ведущий:</span> <input type="text" id="story_host" placeholder="ID или имя" style="width: 100%;">
            <span>Список выступающих:</span> <input type="text" id="story_speakers" placeholder="ID или имя, ID или имя, ID или имя" style="width: 100%;">
            <span>Список слушателей:</span> <input type="text" id="story_listeners" placeholder="ID или имя, ID или имя, ID или имя" style="width: 100%;">
        </div>
        <button id="story_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#story_submit').onclick = async () => {
            const dateInput = div.querySelector('#story_date').value;
            const date = dateInput ? formatDateForHunt(dateInput) : 'дд.мм.гг';
            const time = div.querySelector('#story_time').value || '00:00';
            const host = div.querySelector('#story_host').value;
            const speakers = div.querySelector('#story_speakers').value;
            const listeners = div.querySelector('#story_listeners').value;

            let convertedHost = 'ID';
            let convertedSpeakers = 'ID';
            let convertedListeners = 'ID';

            if (host) {
                const converted = await convertNamesToIds(host);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedHost = idMatch ? idMatch[1] : host;
            }
            if (speakers) {
                const converted = await convertNamesToIds(speakers);
                const idMatches = converted.match(/\[link(\d+)\]/g);
                if (idMatches) {
                    convertedSpeakers = idMatches.map(m => m.match(/\d+/)[0]).join(', ');
                } else {
                    convertedSpeakers = speakers;
                }
            }
            if (listeners) {
                const converted = await convertNamesToIds(listeners);
                const idMatches = converted.match(/\[link(\d+)\]/g);
                if (idMatches) {
                    convertedListeners = idMatches.map(m => m.match(/\d+/)[0]).join(', ');
                } else {
                    convertedListeners = listeners;
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Вечер сказок[/b]\n[b]Дата и время:[/b] ${date}, ${time};\n[b]Ведущий:[/b] ${convertedHost};\n[b]Список выступающих:[/b] ${convertedSpeakers};\n[b]Список слушателей:[/b] ${convertedListeners}.`;
                field.focus();
            }
        };

        return div;
    }

    function createTournamentForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Проведение охотничьего турнира</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Дата:</span> <input type="date" id="tour_date" value="${getCurrentDateForInput()}" style="width: 100%;">
            <span>Время:</span> <input type="time" id="tour_time" value="14:00" style="width: 100%;" step="60">
            <span>Проводящий(ие):</span> <input type="text" id="tour_host" placeholder="ID или имя, ID или имя" style="width: 100%;">
            <span>Список участников:</span> <input type="text" id="tour_participants" placeholder="ID или имя (+), ID или имя, ID или имя (+)" style="width: 100%;">
        </div>
        <button id="tour_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#tour_submit').onclick = async () => {
            const dateInput = div.querySelector('#tour_date').value;
            const date = dateInput ? formatDateForHunt(dateInput) : 'дд.мм.гг';
            const time = div.querySelector('#tour_time').value || '00:00';
            const host = div.querySelector('#tour_host').value;
            const participants = div.querySelector('#tour_participants').value;

            let convertedHost = 'ID';
            if (host) {
                const converted = await convertNamesToIds(host);
                const idMatch = converted.match(/\[link(\d+)\]/g);
                if (idMatch) {
                    convertedHost = idMatch.map(m => m.match(/\d+/)[0]).join(', ');
                } else {
                    convertedHost = host;
                }
            }

            let convertedParticipants = participants;
            if (participants) {
                const parts = participants.split(',').map(p => p.trim());
                const convertedParts = [];
                for (const part of parts) {
                    const match = part.match(/(.+?)\s*\(\+\)/);
                    if (match) {
                        const name = match[1].trim();
                        const converted = await convertNamesToIds(name);
                        const idMatch = converted.match(/\[link(\d+)\]/);
                        convertedParts.push(idMatch ? `${idMatch[1]} (+)` : `${name} (+)`);
                    } else {
                        const converted = await convertNamesToIds(part);
                        const idMatch = converted.match(/\[link(\d+)\]/);
                        convertedParts.push(idMatch ? idMatch[1] : part);
                    }
                }
                convertedParticipants = convertedParts.join(', ');
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Турнир[/b]\n[b]Дата и время:[/b] ${date}, ${time};\n[b]Проводящий(ие):[/b] ${convertedHost};\n[b]Список всех участников:[/b] ${convertedParticipants}.`;
                field.focus();
            }
        };

        return div;
    }

    function createWateringForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Сопровождение котёнка на Дрейфующие льды</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Относящий:</span> <input type="text" id="water_carrier" placeholder="ID или имя" style="width: 100%;">
            <span>Котята:</span> <input type="text" id="water_kittens" placeholder="ID или имя, ID или имя, ID или имя" style="width: 100%;">
            <span>Время начала:</span> <input type="time" id="water_start" value="12:00" style="width: 100%;" step="60">
            <span>Время окончания:</span> <input type="time" id="water_end" value="13:00" style="width: 100%;" step="60">
        </div>
        <button id="water_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#water_submit').onclick = async () => {
            const carrier = div.querySelector('#water_carrier').value;
            const kittens = div.querySelector('#water_kittens').value;
            const start = div.querySelector('#water_start').value || 'чч:мм';
            const end = div.querySelector('#water_end').value || 'чч:мм';

            let convertedCarrier = 'ID';
            let convertedKittens = 'ID';

            if (carrier) {
                const converted = await convertNamesToIds(carrier);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedCarrier = idMatch ? idMatch[1] : carrier;
            }
            if (kittens) {
                const converted = await convertNamesToIds(kittens);
                const idMatches = converted.match(/\[link(\d+)\]/g);
                if (idMatches) {
                    convertedKittens = idMatches.map(m => m.match(/\d+/)[0]).join(', ');
                } else {
                    convertedKittens = kittens;
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Водопой[/b]\n[b]Относящий:[/b] ${convertedCarrier};\n[b]Котята:[/b] ${convertedKittens};\n[b]Время:[/b] ${start} — ${end}.`;
                field.focus();
            }
        };

        return div;
    }

    function createExcursionForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Вылазка</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Цель вылазки:</span>
            <select id="excursion_goal" style="width: 100%;">
                <option value="Экскурсия">Экскурсия</option>
                <option value="Арин">Арин</option>
                <option value="Вылазка">Вылазка</option>
            </select>
            <span>Проводящий:</span> <input type="text" id="excursion_leader" placeholder="ID или имя" style="width: 100%;">
            <span>Котята:</span> <input type="text" id="excursion_kittens" placeholder="ID или имя, ID или имя, ID или имя" style="width: 100%;">
            <span>Подтверждение:</span> <input type="text" id="excursion_proof" placeholder="время или кол-во локаций" style="width: 100%;">
        </div>
        <button id="excursion_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#excursion_submit').onclick = async () => {
            const goal = div.querySelector('#excursion_goal').value;
            const leader = div.querySelector('#excursion_leader').value;
            const kittens = div.querySelector('#excursion_kittens').value;
            const proof = div.querySelector('#excursion_proof').value || '—';

            let convertedLeader = 'ID';
            let convertedKittens = 'ID';

            if (leader) {
                const converted = await convertNamesToIds(leader);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedLeader = idMatch ? idMatch[1] : leader;
            }
            if (kittens) {
                const converted = await convertNamesToIds(kittens);
                const idMatches = converted.match(/\[link(\d+)\]/g);
                if (idMatches) {
                    convertedKittens = idMatches.map(m => m.match(/\d+/)[0]).join(', ');
                } else {
                    convertedKittens = kittens;
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Вылазка[/b]\n[b]Цель вылазки:[/b] ${goal};\n[b]Проводящий:[/b] ${convertedLeader};\n[b]Котята:[/b] ${convertedKittens};\n[b]Подтверждение:[/b] ${proof}.`;
                field.focus();
            }
        };

        return div;
    }

    function createFamilyUpdateForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Обновление информации о семье</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Родитель 1:</span> <input type="text" id="family_parent1" placeholder="ID или имя" style="width: 100%;">
            <span>Родитель 2:</span> <input type="text" id="family_parent2" placeholder="ID или имя" style="width: 100%;">
            <span>Что требуется:</span>
            <select id="family_what" style="width: 100%;">
                <option value="личной карточки">личной карточки</option>
                <option value="профиля вк">профиля вк</option>
                <option value="сфер деятельности">сфер деятельности</option>
            </select>
            <span>Новая информация:</span> <textarea id="family_newinfo" rows="3" placeholder="текст" style="width: 100%;"></textarea>
        </div>
        <button id="family_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#family_submit').onclick = async () => {
            const parent1 = div.querySelector('#family_parent1').value;
            const parent2 = div.querySelector('#family_parent2').value;
            const what = div.querySelector('#family_what').value;
            const newinfo = div.querySelector('#family_newinfo').value || 'текст';

            let convertedParent1 = 'ID';
            let convertedParent2 = 'ID';

            if (parent1) {
                const converted = await convertNamesToIds(parent1);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedParent1 = idMatch ? idMatch[1] : parent1;
            }
            if (parent2) {
                const converted = await convertNamesToIds(parent2);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedParent2 = idMatch ? idMatch[1] : parent2;
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Гнёздышко[/b]\n[b]Родители:[/b] ${convertedParent1} x ${convertedParent2}.\nТребуется замена ${what}.\n[b]Новая информация:[/b] ${newinfo}`;
                field.focus();
            }
        };

        return div;
    }

    function createGraduateForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Выпуск котёнка</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Родитель 1:</span> <input type="text" id="grad_parent1" placeholder="ID или имя" style="width: 100%;">
            <span>Родитель 2:</span> <input type="text" id="grad_parent2" placeholder="ID или имя" style="width: 100%;">
            <span>Котята-выпускники:</span> <input type="text" id="grad_kittens" placeholder="ID или имя, ID или имя" style="width: 100%;">
        </div>
        <button id="grad_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#grad_submit').onclick = async () => {
            const parent1 = div.querySelector('#grad_parent1').value;
            const parent2 = div.querySelector('#grad_parent2').value;
            const kittens = div.querySelector('#grad_kittens').value;

            let convertedParent1 = 'ID';
            let convertedParent2 = 'ID';
            let convertedKittens = 'ID';

            if (parent1) {
                const converted = await convertNamesToIds(parent1);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedParent1 = idMatch ? idMatch[1] : parent1;
            }
            if (parent2) {
                const converted = await convertNamesToIds(parent2);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedParent2 = idMatch ? idMatch[1] : parent2;
            }
            if (kittens) {
                const converted = await convertNamesToIds(kittens);
                const idMatches = converted.match(/\[link(\d+)\]/g);
                if (idMatches) {
                    convertedKittens = idMatches.map(m => m.match(/\d+/)[0]).join(', ');
                } else {
                    convertedKittens = kittens;
                }
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Гнёздышко[/b]\n[b]Родители:[/b] ${convertedParent1} x ${convertedParent2}.\nНекоторые котята в нашей семье подросли и стали воспитанниками.\n[b]Котята-выпускники:[/b] ${convertedKittens}.`;
                field.focus();
            }
        };

        return div;
    }

    function createFamilyAddForm() {
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '10px';
        div.style.backgroundColor = COLORS.bgLight;
        div.style.border = '1px solid ' + COLORS.border;
        div.innerHTML = `
        <div style="background-color: ${COLORS.bgAccent}; padding: 4px; margin-bottom: 10px; font-weight: bold;">Пополнение в семье</div>
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px; align-items: center;">
            <span>Родитель 1:</span> <input type="text" id="add_parent1" placeholder="ID или имя" style="width: 100%;">
            <span>Родитель 2:</span> <input type="text" id="add_parent2" placeholder="ID или имя" style="width: 100%;">
            <span>Новые котята:</span> <input type="text" id="add_kittens" placeholder="ID или имя, ID или имя, ID или имя" style="width: 100%;">
        </div>
        <button id="add_submit" style="width:100%; margin-top:10px; padding:6px; background:${COLORS.bgMain}; color:${COLORS.textLight}; border:none; cursor:pointer;">Сформировать</button>
    `;

        div.querySelector('#add_submit').onclick = async () => {
            const parent1 = div.querySelector('#add_parent1').value;
            const parent2 = div.querySelector('#add_parent2').value;
            const kittens = div.querySelector('#add_kittens').value;

            let convertedParent1 = 'ID';
            let convertedParent2 = 'ID';
            let convertedKittens = '';

            if (parent1) {
                const converted = await convertNamesToIds(parent1);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedParent1 = idMatch ? idMatch[1] : parent1;
            }
            if (parent2) {
                const converted = await convertNamesToIds(parent2);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedParent2 = idMatch ? idMatch[1] : parent2;
            }
            if (kittens) {
                const ids = kittens.split(',').map(id => id.trim());
                const convertedIds = [];
                for (const id of ids) {
                    const converted = await convertNamesToIds(id);
                    const idMatch = converted.match(/\[link(\d+)\]/);
                    if (idMatch) {
                        convertedIds.push(`[[n]link[/n]${idMatch[1]}]`);
                    } else {
                        convertedIds.push(id);
                    }
                }
                convertedKittens = convertedIds.join(', ');
            }

            const field = document.querySelector('#comment');
            if (field) {
                field.value = `[b]Гнёздышко[/b]\n[b]Родители:[/b] ${convertedParent1} x ${convertedParent2}.\nВ нашей семье прибавление.\n[b]Новая информация:[/b] ${convertedKittens}.`;
                field.focus();
            }
        };

        return div;
    }

    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'report-helper-panel';
        panel.innerHTML = `
        <div class="panel-header">Автоматизированные отчёты</div>
        <div class="tab-bar" style="display: flex; border-bottom: 2px solid ${COLORS.border}; margin-bottom: 10px;">
            <div class="tab-btn active" data-tab="auto" style="padding: 6px 12px; background: ${COLORS.bgMain}; color: ${COLORS.textLight}; cursor: pointer; border-top-left-radius: 4px; border-top-right-radius: 4px; margin-right: 4px;">Автоматизация</div>
            <div class="tab-btn" data-tab="templates" style="padding: 6px 12px; background: ${COLORS.bgAccent}; color: ${COLORS.textDark}; cursor: pointer; border-top-left-radius: 4px; border-top-right-radius: 4px;">Шаблоны</div>
        </div>
        <div class="tab-content"></div>
    `;

        panel.querySelector('.panel-header').style.cssText = `
        background-color: ${COLORS.bgMain};
        color: ${COLORS.textLight};
        padding: 8px 12px;
        margin: -10px -10px 10px -10px;
        border-top-left-radius: 6px;
        border-top-right-radius: 6px;
        font-size: 20px;
        font-weight: bold;
        text-align: center;
        font-family: Impact, fantasy;
        letter-spacing: 1px;
    `;

        panel.style.cssText = `
        background-color: ${COLORS.bgLight};
        border: 2px solid ${COLORS.border};
        border-radius: 8px;
        margin: 20px 0 10px 0;
        padding: 10px;
        font-family: 'Bookman Old Style', serif;
        color: ${COLORS.textDark};
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    `;

        const tabBar = panel.querySelector('.tab-bar');
        const content = panel.querySelector('.tab-content');

        const autoTab = createAutoTab();
        const templatesTab = createTemplatesTab();
        templatesTab.style.display = 'none';
        content.appendChild(autoTab);
        content.appendChild(templatesTab);

        tabBar.querySelector('[data-tab="auto"]').onclick = () => {
            tabBar.querySelectorAll('.tab-btn').forEach(b => {
                b.style.background = COLORS.bgAccent;
                b.style.color = COLORS.textDark;
            });
            const active = tabBar.querySelector('[data-tab="auto"]');
            active.style.background = COLORS.bgMain;
            active.style.color = COLORS.textLight;
            autoTab.style.display = 'block';
            templatesTab.style.display = 'none';
        };

        tabBar.querySelector('[data-tab="templates"]').onclick = () => {
            tabBar.querySelectorAll('.tab-btn').forEach(b => {
                b.style.background = COLORS.bgAccent;
                b.style.color = COLORS.textDark;
            });
            const active = tabBar.querySelector('[data-tab="templates"]');
            active.style.background = COLORS.bgMain;
            active.style.color = COLORS.textLight;
            autoTab.style.display = 'none';
            templatesTab.style.display = 'block';
        };

        const contactLine = document.createElement('div');
        contactLine.style.cssText = `
        text-align: center;
        margin-top: 10px;
        padding: 5px;
        font-size: 11px;
        color: ${COLORS.textDark};
        border-top: 1px dashed ${COLORS.border};
    `;
        contactLine.innerHTML = 'По всем вопросам, изменениям и багам обращаться к <a href="/cat1672106" target="_blank">Воющему</a>.';
        panel.appendChild(contactLine);

        return panel;
    }

    function addCopyButtons() {
        const processBlock = (block, isSingleBlock = false) => {
            if (!block) return;

            const html = block.innerHTML;
            let paragraphs;

            if (isSingleBlock) {
                paragraphs = [html];
            } else {
                paragraphs = html.split('<br><br>').map(p => p.trim()).filter(p => p.length > 0);
            }

            let newHtml = '';
            paragraphs.forEach((p, index) => {
                let text = p.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                text = text.replace(/\[\s*l\s*\[\s*n\s*\]\s*ink\s*\[\s*\/\s*n\s*\]\s*I\s*D\s*\]/gi, '[l[n]ink[/n]ID]');
                newHtml += `<div style="display: flex; align-items: center; gap: 8px; margin: 8px 0; ${index < paragraphs.length - 1 ? 'border-bottom: 1px dashed #2b323b; padding-bottom: 8px;' : ''}">`;
                newHtml += `<span style="flex: 1;">${p}</span>`;
                newHtml += `<span class="custom-copy-btn" data-text="${text.replace(/"/g, '&quot;')}" style="cursor: pointer; opacity: 0.7; font-size: 16px; flex-shrink: 0;" title="Скопировать этот пункт">📋</span>`;
                newHtml += `</div>`;
            });

            block.innerHTML = newHtml;

            block.querySelectorAll('.custom-copy-btn').forEach(btn => {
                const text = btn.dataset.text;
                btn.onmouseover = () => btn.style.opacity = '1';
                btn.onmouseout = () => btn.style.opacity = '0.7';
                btn.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await navigator.clipboard.writeText(text);
                    btn.textContent = '✅';
                    setTimeout(() => btn.textContent = '📋', 1000);
                };
            });
        };

        const firstBlock = document.querySelector('.blocks[data-menu="гавгавгав1"]');
        if (firstBlock) processBlock(firstBlock);

        const secondBlock = document.querySelector('.blocks[data-menu="чирикчирикчирик2"]');
        if (secondBlock) processBlock(secondBlock, true);

        const thirdBlock = document.querySelector('.blocks[data-menu="птчлпк3"]');
        if (thirdBlock) processBlock(thirdBlock);
    }

    function addGuardCopyButtons() {
        const guardBlocks = document.querySelectorAll('.blocks[data-menu="инструктажи"], .blocks[data-menu="инструктаж для котят"]');

        guardBlocks.forEach(block => {
            if (!block) return;

            const html = block.innerHTML;
            const lines = html.split(/<br\s*\/?>/).map(l => l.trim()).filter(l => l.length > 0 && !l.match(/^[ \s]*$/));

            let newHtml = '';
            let currentInstructions = [];
            let inInstruction = false;

            lines.forEach((line) => {
                const cleanLine = line.replace(/<[^>]*>/g, ' ').replace(/[ \s]/g, ' ').trim();
                if (!cleanLine) return;

                if (line.includes('Инструктаж на') || line.includes('Общий инструктаж:')) {
                    if (currentInstructions.length > 0) {
                        currentInstructions.forEach((text, i) => {
                            const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                            if (cleanText) {
                                newHtml += `<div style="display: flex; align-items: center; gap: 8px; margin: 8px 0; ${i < currentInstructions.length - 1 ? 'border-bottom: 1px dashed #2b323b; padding-bottom: 8px;' : ''}">`;
                                newHtml += `<span style="flex: 1; font-weight: normal;">${text}</span>`;
                                newHtml += `<span class="custom-copy-btn" data-text="${cleanText.replace(/"/g, '&quot;')}" style="cursor: pointer; opacity: 0.7; font-size: 16px; flex-shrink: 0;" title="Скопировать этот пункт">📋</span>`;
                                newHtml += `</div>`;
                            }
                        });
                        currentInstructions = [];
                    }
                    newHtml += `<div style="margin: 12px 0 8px 0; font-weight: bold; font-size: 14px;">${line}</div>`;
                    inInstruction = true;
                } else if (inInstruction) {
                    if (cleanLine && !line.includes('class="custom-copy-btn"')) {
                        currentInstructions.push(line);
                    }
                }
            });

            if (currentInstructions.length > 0) {
                currentInstructions.forEach((text, i) => {
                    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                    if (cleanText) {
                        newHtml += `<div style="display: flex; align-items: center; gap: 8px; margin: 8px 0; ${i < currentInstructions.length - 1 ? 'border-bottom: 1px dashed #2b323b; padding-bottom: 8px;' : ''}">`;
                        newHtml += `<span style="flex: 1; font-weight: normal;">${text}</span>`;
                        newHtml += `<span class="custom-copy-btn" data-text="${cleanText.replace(/"/g, '&quot;')}" style="cursor: pointer; opacity: 0.7; font-size: 16px; flex-shrink: 0;" title="Скопировать этот пункт">📋</span>`;
                        newHtml += `</div>`;
                    }
                });
            }

            block.innerHTML = newHtml;

            block.querySelectorAll('.custom-copy-btn').forEach(btn => {
                const text = btn.dataset.text;
                btn.onmouseover = () => btn.style.opacity = '1';
                btn.onmouseout = () => btn.style.opacity = '0.7';
                btn.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await navigator.clipboard.writeText(text);
                    btn.textContent = '✅';
                    setTimeout(() => btn.textContent = '📋', 1000);
                };
            });
        });
    }

    waitForElement('#send_comment', (commentBlock) => {
        const panel = createPanel();
        if (panel) {
            insertAfter(commentBlock, panel);
        }
    });

    if (isHunt) {
        waitForElement('.blocks[data-menu="гавгавгав1"]', () => {
            addCopyButtons();
        });
    }

    if (isGuard) {
        waitForElement('.blocks[data-menu="инструктажи"]', () => {
            addGuardCopyButtons();
        });
    }

    if (isLsPage) {
        const isNewPage = window.location.search.includes('?new');

        if (isNewPage) {
            waitForElement('#write_form', (writeForm) => {
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = `
                display: flex;
                gap: 8px;
                margin: 8px 0;
                padding: 8px;
                background-color: ${COLORS.bgLight};
                border: 1px solid ${COLORS.border};
                border-radius: 6px;
            `;

                const herbButton = document.createElement('button');
                herbButton.textContent = 'Отписать травник';
                herbButton.style.cssText = `
                background-color: ${COLORS.bgMain};
                color: ${COLORS.textLight};
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-family: 'Bookman Old Style', serif;
                font-size: 13px;
                font-weight: bold;
                transition: 0.2s;
                flex: 1;
            `;
                herbButton.onmouseover = () => herbButton.style.backgroundColor = '#3a4450';
                herbButton.onmouseout = () => herbButton.style.backgroundColor = COLORS.bgMain;
                herbButton.onclick = () => showHerbForm();

                const huntButton = document.createElement('button');
                huntButton.textContent = 'Отписать охоту';
                huntButton.style.cssText = herbButton.style.cssText;
                huntButton.onmouseover = () => huntButton.style.backgroundColor = '#3a4450';
                huntButton.onmouseout = () => huntButton.style.backgroundColor = COLORS.bgMain;
                huntButton.onclick = () => showHuntForm();

                buttonContainer.appendChild(herbButton);
                buttonContainer.appendChild(huntButton);
                writeForm.parentNode.insertBefore(buttonContainer, writeForm);
            });

            const receiver = sessionStorage.getItem('ls_receiver');
            const subject = sessionStorage.getItem('ls_subject');
            const message = sessionStorage.getItem('ls_message');

            if (receiver && subject && message) {
                waitForElement('#login', (loginField) => {
                    const subjectField = document.querySelector('#subject');
                    const textField = document.querySelector('#text');

                    loginField.value = receiver;
                    if (subjectField) subjectField.value = subject;
                    if (textField) textField.value = message;

                    sessionStorage.removeItem('ls_receiver');
                    sessionStorage.removeItem('ls_subject');
                    sessionStorage.removeItem('ls_message');
                });
            }
        } else {
            waitForElement('#page_form', (pageForm) => {
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = `
                display: flex;
                gap: 8px;
                margin: 8px 0;
                padding: 8px;
                background-color: ${COLORS.bgLight};
                border: 1px solid ${COLORS.border};
                border-radius: 6px;
            `;

                const herbButton = document.createElement('button');
                herbButton.textContent = 'Отписать травник';
                herbButton.style.cssText = `
                background-color: ${COLORS.bgMain};
                color: ${COLORS.textLight};
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-family: 'Bookman Old Style', serif;
                font-size: 13px;
                font-weight: bold;
                transition: 0.2s;
                flex: 1;
            `;
                herbButton.onmouseover = () => herbButton.style.backgroundColor = '#3a4450';
                herbButton.onmouseout = () => herbButton.style.backgroundColor = COLORS.bgMain;
                herbButton.onclick = () => showHerbForm();

                const huntButton = document.createElement('button');
                huntButton.textContent = 'Отписать охоту';
                huntButton.style.cssText = herbButton.style.cssText;
                huntButton.onmouseover = () => huntButton.style.backgroundColor = '#3a4450';
                huntButton.onmouseout = () => huntButton.style.backgroundColor = COLORS.bgMain;
                huntButton.onclick = () => showHuntForm();

                buttonContainer.appendChild(herbButton);
                buttonContainer.appendChild(huntButton);
                pageForm.parentNode.insertBefore(buttonContainer, pageForm);
            });
        }
    }

    function showHerbForm() {
        const existingForm = document.getElementById('herb-ls-form');
        if (existingForm) existingForm.remove();

        const loginField = document.querySelector('#login');
        const savedReceiver = loginField ? loginField.value : sessionStorage.getItem('herb_receiver_temp') || '';
        const savedSender = sessionStorage.getItem('herb_sender_temp') || '';

        const form = document.createElement('div');
        form.id = 'herb-ls-form';
        form.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 380px;
        background: ${COLORS.bgLight};
        border: 2px solid ${COLORS.border};
        border-radius: 8px;
        padding: 16px;
        z-index: 10000;
        color: ${COLORS.textDark};
        font-family: 'Bookman Old Style', serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;

        form.innerHTML = `
        <div style="background-color: ${COLORS.bgMain}; color: ${COLORS.textLight}; padding: 6px 10px; margin: -16px -16px 15px -16px; border-top-left-radius: 6px; border-top-right-radius: 6px; font-size: 16px; font-weight: bold; text-align: center; font-family: Impact, fantasy; letter-spacing: 0.5px;">
            Отправить шаману
        </div>
        <div style="display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: center; margin-bottom: 15px; font-size: 13px;">
            <span>Принимающий:</span> <input type="text" id="herb_receiver" placeholder="ID или имя" value="${savedReceiver}" style="width: 100%; padding: 3px; background: #fff; border: 1px solid ${COLORS.border}; color: #000;">
            <span>Ваше имя/ID:</span> <input type="text" id="herb_sender" placeholder="ID или имя" value="${savedSender}" style="width: 100%; padding: 3px; background: #fff; border: 1px solid ${COLORS.border}; color: #000;">
            <span>Кол-во трав:</span> <input type="text" id="herb_grass" placeholder="0" style="width: 100%; padding: 3px; background: #fff; border: 1px solid ${COLORS.border}; color: #000;">
            <span>Кол-во паутины:</span> <input type="text" id="herb_web" placeholder="0" style="width: 100%; padding: 3px; background: #fff; border: 1px solid ${COLORS.border}; color: #000;">
            <span>Кол-во веток:</span> <input type="text" id="herb_branch" placeholder="0" style="width: 100%; padding: 3px; background: #fff; border: 1px solid ${COLORS.border}; color: #000;">
            <span>Кол-во вьюнков:</span> <input type="text" id="herb_bindweed" placeholder="0" style="width: 100%; padding: 3px; background: #fff; border: 1px solid ${COLORS.border}; color: #000;">
            <span>Кол-во костоправов:</span> <input type="text" id="herb_splint" placeholder="0" style="width: 100%; padding: 3px; background: #fff; border: 1px solid ${COLORS.border}; color: #000;">
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="herb_cancel" style="background: #4a4a4a; color: ${COLORS.textLight}; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">Отмена</button>
            <button id="herb_submit" style="background: ${COLORS.bgMain}; color: ${COLORS.textLight}; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">Сформировать</button>
        </div>
    `;

        document.body.appendChild(form);

        document.getElementById('herb_cancel').onclick = () => form.remove();
        document.getElementById('herb_submit').onclick = async () => {
            const receiver = document.getElementById('herb_receiver').value;
            const sender = document.getElementById('herb_sender').value;
            const grass = document.getElementById('herb_grass').value;
            const web = document.getElementById('herb_web').value;
            const branch = document.getElementById('herb_branch').value;
            const bindweed = document.getElementById('herb_bindweed').value;
            const splint = document.getElementById('herb_splint').value;

            if (!receiver || !sender) {
                alert('Заполните получателя и отправителя');
                return;
            }

            const formattedReceiver = receiver.split(' ').map(word => {
                if (word.length === 0) return word;
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');

            const formattedSender = sender.split(' ').map(word => {
                if (word.length === 0) return word;
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');

            sessionStorage.setItem('herb_receiver_temp', receiver);
            sessionStorage.setItem('herb_sender_temp', sender);

            let convertedSender = sender;
            if (!sender.match(/^\d+$/)) {
                const converted = await convertNamesToIds(sender);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedSender = idMatch ? idMatch[1] : sender;
            } else {
                convertedSender = sender;
            }

            const items = [];
            if (grass && grass !== '0') {
                const num = parseInt(grass);
                const word = getWordForm(num, ['трава', 'травы', 'трав']);
                items.push(`${num} ${word}`);
            }
            if (web && web !== '0') {
                const num = parseInt(web);
                const word = getWordForm(num, ['паутина', 'паутины', 'паутин']);
                items.push(`${num} ${word}`);
            }
            if (branch && branch !== '0') {
                const num = parseInt(branch);
                const word = getWordForm(num, ['ветка', 'ветки', 'веток']);
                items.push(`${num} ${word}`);
            }
            if (bindweed && bindweed !== '0') {
                const num = parseInt(bindweed);
                const word = getWordForm(num, ['вьюнок', 'вьюнка', 'вьюнков']);
                items.push(`${num} ${word}`);
            }
            if (splint && splint !== '0') {
                const num = parseInt(splint);
                const word = getWordForm(num, ['костоправ', 'костоправа', 'костоправов']);
                items.push(`${num} ${word}`);
            }

            let message = '';
            if (items.length > 0) {
                message = `${convertedSender} (${items.join(', ')})`;
            } else {
                message = `${convertedSender} (пусто)`;
            }

            sessionStorage.setItem('ls_receiver', formattedReceiver);
            sessionStorage.setItem('ls_subject', 'Травник');
            sessionStorage.setItem('ls_message', message);

            window.location.href = '/ls?new';
        };
    }

    function showHuntForm() {
        const existingForm = document.getElementById('hunt-ls-form');
        if (existingForm) existingForm.remove();

        const loginField = document.querySelector('#login');
        const savedLeader = loginField ? loginField.value : sessionStorage.getItem('hunt_leader_temp') || '';
        const savedSender = sessionStorage.getItem('hunt_sender_temp') || '';

        const form = document.createElement('div');
        form.id = 'hunt-ls-form';
        form.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 380px;
        background: ${COLORS.bgLight};
        border: 2px solid ${COLORS.border};
        border-radius: 8px;
        padding: 16px;
        z-index: 10000;
        color: ${COLORS.textDark};
        font-family: 'Bookman Old Style', serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    `;

        form.innerHTML = `
        <div style="background-color: ${COLORS.bgMain}; color: ${COLORS.textLight}; padding: 6px 10px; margin: -16px -16px 15px -16px; border-top-left-radius: 6px; border-top-right-radius: 6px; font-size: 16px; font-weight: bold; text-align: center; font-family: Impact, fantasy; letter-spacing: 0.5px;">
            Отправить ведущему
        </div>
        <div style="display: grid; grid-template-columns: 110px 1fr; gap: 10px; align-items: center; margin-bottom: 5px; font-size: 13px;">
            <span>Ведущий:</span> <input type="text" id="hunt_leader" placeholder="ID или имя" value="${savedLeader}" style="width: 100%; padding: 3px; background: #fff; border: 1px solid ${COLORS.border}; color: #000;">
            <span>Ваше имя/ID:</span> <input type="text" id="hunt_sender" placeholder="ID или имя" value="${savedSender}" style="width: 100%; padding: 3px; background: #fff; border: 1px solid ${COLORS.border}; color: #000;">
            <span>Кол-во дичи:</span> <input type="text" id="hunt_count" placeholder="n" style="width: 100%; padding: 3px; background: #fff; border: 1px solid ${COLORS.border}; color: #000;">
            <span>Особая дичь:</span> <input type="text" id="hunt_special" placeholder="n" style="width: 100%; padding: 3px; background: #fff; border: 1px solid ${COLORS.border}; color: #000;">
        </div>
        <div style="font-size: 11px; color: ${COLORS.warning}; margin-bottom: 10px; text-align: center;">
            Если вы носильщик, оставьте поле «Кол-во дичи» пустым
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="hunt_cancel" style="background: #4a4a4a; color: ${COLORS.textLight}; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">Отмена</button>
            <button id="hunt_submit" style="background: ${COLORS.bgMain}; color: ${COLORS.textLight}; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">Сформировать</button>
        </div>
    `;

        document.body.appendChild(form);

        document.getElementById('hunt_cancel').onclick = () => form.remove();
        document.getElementById('hunt_submit').onclick = async () => {
            const leader = document.getElementById('hunt_leader').value;
            const sender = document.getElementById('hunt_sender').value;
            const count = document.getElementById('hunt_count').value;
            const special = document.getElementById('hunt_special').value;

            if (!leader || !sender) {
                alert('Заполните ведущего и отправителя');
                return;
            }

            const formattedLeader = leader.split(' ').map(word => {
                if (word.length === 0) return word;
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');

            const formattedSender = sender.split(' ').map(word => {
                if (word.length === 0) return word;
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');

            sessionStorage.setItem('hunt_leader_temp', leader);
            sessionStorage.setItem('hunt_sender_temp', sender);

            let convertedSender = sender;
            if (!sender.match(/^\d+$/)) {
                const converted = await convertNamesToIds(sender);
                const idMatch = converted.match(/\[link(\d+)\]/);
                convertedSender = idMatch ? `[l[n]ink[/n]${idMatch[1]}]` : sender;
            } else {
                convertedSender = `[l[n]ink[/n]${sender}]`;
            }

            let message = '';
            if (!count && !special) {
                message = `${convertedSender} (носил)`;
            } else {
                const parts = [];
                if (count) parts.push(count);
                message = `${convertedSender} (${parts.join(', ')})`;
            }

            if (special) {
                message += `\nОсобая: ${convertedSender} (${special})`;
            }

            sessionStorage.setItem('ls_receiver', formattedLeader);
            sessionStorage.setItem('ls_subject', 'Охота');
            sessionStorage.setItem('ls_message', message);

            window.location.href = '/ls?new';
        };
    }

    if (!isLsPage) {
        const scrollArrow = document.createElement('div');
        scrollArrow.innerHTML = '↓';
        scrollArrow.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 45px;
        height: 45px;
        background-color: ${COLORS.bgMain};
        color: ${COLORS.textLight};
        border: 2px solid ${COLORS.border};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        opacity: 1;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    `;
        scrollArrow.onmouseover = () => scrollArrow.style.backgroundColor = '#3a4450';
        scrollArrow.onmouseout = () => scrollArrow.style.backgroundColor = COLORS.bgMain;
        scrollArrow.onclick = () => {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'auto'
            });
        };
        document.body.appendChild(scrollArrow);
    }

    if (isHunt) {
        const counterState = JSON.parse(localStorage.getItem('hunt_counter_state')) || {
            visible: true,
            hunter: '',
            expanded: true
        };

        const huntCounter = document.createElement('div');
        huntCounter.id = 'hunt-week-counter';
        huntCounter.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 280px;
        background-color: ${COLORS.bgLight};
        border: 2px solid ${COLORS.border};
        border-radius: 8px;
        padding: 10px;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        font-family: 'Bookman Old Style', serif;
        display: ${counterState.visible ? 'block' : 'none'};
    `;

        const minimizedTab = document.createElement('div');
        minimizedTab.id = 'hunt-minimized-tab';
        minimizedTab.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${COLORS.bgMain};
        color: ${COLORS.textLight};
        border: 2px solid ${COLORS.border};
        border-radius: 8px;
        padding: 8px 12px;
        cursor: pointer;
        z-index: 9999;
        font-family: 'Bookman Old Style', serif;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        display: ${counterState.visible ? 'none' : 'block'};
    `;
        minimizedTab.innerHTML = 'Открыть подсчёт СО';

        const header = document.createElement('div');
        header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 5px;
        background-color: ${COLORS.bgMain};
        color: ${COLORS.textLight};
        margin: -10px -10px 10px -10px;
        border-top-left-radius: 6px;
        border-top-right-radius: 6px;
        font-weight: bold;
    `;
        header.innerHTML = `
        <span style="cursor: pointer;" class="hunt-counter-toggle">${counterState.expanded ? '▼' : '▶'} Свободная охота</span>
        <span style="cursor: pointer; font-size: 18px; line-height: 1;" class="hunt-counter-close">×</span>
    `;

        const content = document.createElement('div');
        content.className = 'hunt-counter-content';
        content.style.cssText = `
        transition: all 0.3s ease;
        display: ${counterState.expanded ? 'block' : 'none'};
    `;

        content.innerHTML = `
        <div style="margin-bottom: 10px;">
            <input type="text" id="hunter-name-input" placeholder="Ваше имя или ID" value="${counterState.hunter}" style="width: 100%; padding: 5px; background: #fff; border: 1px solid ${COLORS.border}; border-radius: 4px; color: #000; margin-bottom: 8px;">
            <button id="calculate-hunt-btn" style="width: 100%; padding: 6px; background-color: ${COLORS.bgMain}; color: ${COLORS.textLight}; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Посчитать</button>
        </div>
        <div id="hunt-weekly-result" style="font-size: 32px; font-weight: bold; text-align: center; margin: 15px 0 5px 0; color: ${COLORS.bgMain};">0</div>
        <div id="hunt-week-dates" style="font-size: 11px; text-align: center; color: ${COLORS.textDark};"></div>
    `;

        huntCounter.appendChild(header);
        huntCounter.appendChild(content);
        document.body.appendChild(huntCounter);
        document.body.appendChild(minimizedTab);

        minimizedTab.onclick = () => {
            huntCounter.style.display = 'block';
            minimizedTab.style.display = 'none';
            counterState.visible = true;
            localStorage.setItem('hunt_counter_state', JSON.stringify(counterState));
        };

        header.querySelector('.hunt-counter-close').onclick = (e) => {
            e.stopPropagation();
            huntCounter.style.display = 'none';
            minimizedTab.style.display = 'block';
            counterState.visible = false;
            localStorage.setItem('hunt_counter_state', JSON.stringify(counterState));
        };

        const toggleBtn = header.querySelector('.hunt-counter-toggle');
        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            if (counterState.expanded) {
                content.style.display = 'none';
                toggleBtn.innerHTML = '▶ Свободная охота';
            } else {
                content.style.display = 'block';
                toggleBtn.innerHTML = '▼ Свободная охота';
            }
            counterState.expanded = !counterState.expanded;
            localStorage.setItem('hunt_counter_state', JSON.stringify(counterState));
        };

        function getWeekRange() {
            const now = new Date();
            const dayOfWeek = now.getDay();

            const monday = new Date(now);
            const sunday = new Date(now);

            const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
            monday.setDate(now.getDate() + diffToMonday);
            monday.setHours(0, 0, 0, 0);

            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const formatDate = (date) => {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                return `${day}.${month}.${year}`;
            };

            document.getElementById('hunt-week-dates').textContent = `${formatDate(monday)} – ${formatDate(sunday)}`;

            return { start: monday, end: sunday };
        }

        const weekRange = getWeekRange();
        const weekStart = weekRange.start;
        const weekEnd = weekRange.end;

        function parseDate(dateStr) {
            const parts = dateStr.split('.');
            if (parts.length < 3) return null;

            let day = parseInt(parts[0]);
            let month = parseInt(parts[1]) - 1;
            let year = parseInt(parts[2]);

            if (year < 100) year += 2000;

            return new Date(year, month, day);
        }

        async function calculateWeeklyHunt(hunterName) {
            if (!hunterName) return 0;

            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            weekAgo.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(23, 59, 59, 999);

            let convertedId = hunterName;
            const formattedName = hunterName.split(' ').map(word => {
                if (word.length === 0) return word;
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');

            const comments = document.querySelectorAll('.view-comment');
            let total = 0;

            comments.forEach(comment => {
                const commentText = comment.textContent || '';

                if (!commentText.includes('Свободная охота')) return;

                const dateMatch = commentText.match(/Дата:\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/);
                if (!dateMatch) return;

                const commentDate = parseDate(dateMatch[1]);
                if (!commentDate) return;

                if (commentDate < weekStart || commentDate > weekEnd) return;

                const nameMatch = commentText.match(/Охотник:\s*([^\n\.]+)/);
                if (!nameMatch) return;

                let commentHunter = nameMatch[1].trim().replace(/[\[\]link]/g, '');

                if (commentHunter === formattedName) {
                    const countMatch = commentText.match(/Кол-во пойманной дичи:\s*(\d+)/);
                    if (countMatch) {
                        total += parseInt(countMatch[1]);
                    }
                }
            });

            return total;
        }

        const input = document.getElementById('hunter-name-input');
        const calcButton = document.getElementById('calculate-hunt-btn');
        const resultDiv = document.getElementById('hunt-weekly-result');

        calcButton.onclick = async () => {
            const hunterName = input.value.trim();
            if (!hunterName) {
                alert('Введите имя или ID');
                return;
            }

            counterState.hunter = hunterName;
            localStorage.setItem('hunt_counter_state', JSON.stringify(counterState));

            resultDiv.textContent = '0';
            const total = await calculateWeeklyHunt(hunterName);
            resultDiv.textContent = total;
        };

        if (counterState.hunter) {
            setTimeout(async () => {
                const total = await calculateWeeklyHunt(counterState.hunter);
                resultDiv.textContent = total;
            }, 2000);
        }
    }

})();
