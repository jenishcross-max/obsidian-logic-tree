'use strict';
// Logic Tree: плагин Obsidian для Android и ПК. Без сборки и без Node-API.
const obsidian = require('obsidian');
const { PluginSettingTab, Setting, ItemView, TextFileView, Notice, Menu, Scope, Platform, normalizePath, setIcon } = obsidian;

// ---------- Языки ----------
// Русский текст в коде служит ключом, английский берётся из этого словаря.
// Тот же словарь сопоставляет вопросы на стрелках: дерево на одном языке работает в интерфейсе на другом.
const EN = {
  // Вопросы на стрелках
  "Что происходит?": "What is happening?",
  "Почему так происходит?": "Why is this happening?",
  "Что это значит?": "What does it mean?",
  "Что именно?": "What exactly?",
  "К чему это приводит?": "What does it lead to?",
  "Почему это важно?": "Why does it matter?",
  "Что с этим делать?": "What should be done?",
  "Да": "Yes",
  "Нет": "No",
  "Что получает?": "What do they gain?",
  "Что теряет?": "What do they lose?",
  "Что защищает?": "What do they defend?",
  "Чем ответить?": "How to respond?",
  "Почему правда?": "Why is it true?",
  "Например?": "For example?",
  "К чему ведёт?": "What is the impact?",
  "Почему важнее?": "Why does it outweigh?",
  "Кого задевает сильнее?": "Who is affected most?",
  "Вероятность": "Likelihood",
  "Масштаб": "Scale",
  "Критичность": "Severity",
  "Меньшинства": "Minorities",
  "Необратимость": "Irreversibility",
  "почему это правда?": "why is it true?",
  "Цепочка от тезиса к результату, по одному звену. Сначала логика, пример будет на следующем шаге.": "The chain from the claim to the result, one link at a time. Logic first; the example comes next.",
  "какой пример?": "what is an example?",
  "Случай из жизни, который подтверждает логику. Можно пропустить: нажми «Дальше».": "A real case that backs up the logic. You can skip it: tap “Next”.",
  "к чему ведёт и для кого?": "what is the impact, and for whom?",
  "Что меняется в жизни людей и для кого именно, особенно для уязвимых групп. Без преувеличений.": "What changes in people's lives and for whom, especially vulnerable groups. No exaggeration.",
  "почему это важнее?": "why does it outweigh?",
  "Почему это перевешивает соперника. Нажми критерий или напиши свой.": "Why this outweighs the other side. Tap a criterion or write your own.",

  // Позиции британского формата
  "ОП": "OG",
  "Открывающее Правительство": "Opening Government",
  "Первый стол за": "First bench for",
  "ОО": "OO",
  "Открывающая Оппозиция": "Opening Opposition",
  "Первый стол против": "First bench against",
  "ЗП": "CG",
  "Закрывающее Правительство": "Closing Government",
  "Второй стол за": "Second bench for",
  "ЗО": "CO",
  "Закрывающая Оппозиция": "Closing Opposition",
  "Второй стол против": "Second bench against",

  // Типы резолюций
  "Действие": "Policy",
  "ЭП запретит, введёт, ограничит": "This House would ban, introduce, limit",
  "Оставить всё как есть или предложить свой вариант вместо этой меры. Одной фразой.": "Keep things as they are, or propose your own alternative to this measure. In one sentence.",
  "Проблема есть, и мера решает её лучше, чем если оставить всё как есть.": "The problem is real, and the measure solves it better than the status quo.",
  "Мера не сработает, навредит больше, чем поможет, или есть способ лучше.": "The measure won't work, does more harm than good, or there is a better way.",
  "Механизм": "Mechanism",
  "Как это будет работать?": "How will it work?",
  "Кто вводит меру, как именно, что будет за нарушение.": "Who introduces the measure, how exactly, and what happens on violation.",
  "Сожаление": "Regret",
  "ЭП сожалеет о…": "This House regrets…",
  "Чем мир с этим явлением лучше, чем мир без него. Одной фразой.": "Why the world with this is better than the world without it. In one sentence.",
  "Без этого явления мир был бы лучше.": "The world would be better without this.",
  "С этим явлением мир лучше или хотя бы не хуже.": "The world is better with this, or at least no worse.",
  "Сейчас": "Now",
  "Что происходит сейчас?": "What is happening now?",
  "Опиши явление, о котором сожалеет палата, и к чему оно приводит.": "Describe the thing the House regrets and what it leads to.",
  "Мир без этого": "World without it",
  "Каким был бы мир без этого?": "What would the world be like without it?",
  "Что было бы вместо этого явления. С этим миром сравнивают обе стороны.": "What would exist instead. Both sides compare against this world.",
  "Оценка": "Value",
  "ЭП считает, что…": "This House believes that…",
  "Какое утверждение Оппозиция защищает вместо этого. Одной фразой.": "Which claim the Opposition defends instead. In one sentence.",
  "Утверждение верно по самому важному критерию.": "The claim holds by the most important criterion.",
  "Утверждение неверно, или важнее другое.": "The claim is false, or something else matters more.",
  "Критерий": "Criterion",
  "По какому критерию судить?": "By what criterion do we judge?",
  "Что здесь важнее всего: свобода, безопасность, благополучие, справедливость.": "What matters most here: freedom, safety, wellbeing, fairness.",
  "Поддержка": "Support",
  "ЭП поддерживает, выступает против": "This House supports, opposes",
  "Почему это не стоит поддерживать и что стоит поддержать вместо этого. Одной фразой.": "Why this shouldn't be supported and what should be supported instead. In one sentence.",
  "Это явление в целом приносит больше пользы, чем вреда.": "Overall, this does more good than harm.",
  "Это явление приносит больше вреда, чем пользы.": "This does more harm than good.",
  "Что поддерживаем": "What we support",
  "Как это выглядит в жизни?": "What does it look like in real life?",
  "Кто и что делает, когда это явление есть. Конкретные примеры.": "Who does what when this exists. Concrete examples.",
  "Последствия": "Effects",
  "Что меняется для людей, когда этого становится больше.": "What changes for people as there is more of it.",
  "Сравнение": "Comparison",
  "ЭП предпочитает…": "This House prefers…",
  "Второй вариант из сравнения: чем именно он лучше. Одной фразой.": "The second option in the comparison: what exactly makes it better. In one sentence.",
  "Первый вариант лучше по самому важному критерию.": "The first option is better by the most important criterion.",
  "Второй вариант лучше, или они равны.": "The second option is better, or they are equal.",
  "Варианты": "Options",
  "Что с чем сравниваем?": "What are we comparing?",
  "Опиши оба варианта так, как они выглядят в жизни.": "Describe both options as they look in real life.",
  "По какому критерию выбирать?": "By what criterion do we choose?",
  "От лица участника": "As an actor",
  "ЭП, будучи…": "This House, as…",
  "Как этому участнику лучше поступить вместо того, что предлагает резолюция. Одной фразой.": "What this actor should do instead of what the motion proposes. In one sentence.",
  "Участнику выгоднее поступить так, как в резолюции.": "The actor is better off doing what the motion says.",
  "Участнику выгоднее поступить иначе.": "The actor is better off doing something else.",
  "Цели участника": "Actor's goals",
  "Чего хочет этот участник?": "What does this actor want?",
  "От чьего лица резолюция и что для него важнее всего.": "Whose point of view the motion takes and what matters most to them.",
  "Какие у него варианты?": "What are their options?",
  "Что он может сделать вместо того, что предлагает резолюция.": "What they could do instead of what the motion proposes.",

  // Жизненные решения
  "Делать или нет": "Yes or no",
  "Стоит ли…, идти ли…": "Should I…, is it worth…",
  "Цель": "Goal",
  "Зачем мне это?": "Why do I want this?",
  "Чего хочу добиться. Одной фразой.": "What I want to achieve. In one sentence.",
  "За": "For",
  "Что я получу?": "What will I gain?",
  "По одной выгоде: деньги, время, здоровье, учёба, отношения.": "One benefit at a time: money, time, health, studies, relationships.",
  "Против": "Against",
  "Что я потеряю?": "What will I lose?",
  "Чем придётся заплатить и что может пойти не так. По одному.": "What it will cost and what could go wrong. One at a time.",
  "Худший случай": "Worst case",
  "Что самое плохое может случиться?": "What is the worst that could happen?",
  "И можно ли будет это исправить.": "And whether it could be undone.",
  "Решение": "Decision",
  "Что решаю?": "What do I decide?",
  "Да или нет, и первый шаг: что сделаю в ближайшие дни.": "Yes or no, and the first step: what I'll do in the next few days.",
  "Выбор из вариантов": "Choose between options",
  "Это или то, какой взять": "This or that, which one",
  "Что важно": "What matters",
  "Что для меня важно?": "What matters to me?",
  "По одному: деньги, время, здоровье, учёба, спокойствие.": "One at a time: money, time, health, studies, peace of mind.",
  "Какие есть варианты?": "What are the options?",
  "По одному варианту. Потом спрошу плюсы и минусы каждого.": "One option at a time. Then you'll be asked for the pros and cons of each.",
  "Какие плюсы?": "What are the pros?",
  "какие плюсы?": "what are the pros?",
  "Чем этот вариант хорош для того, что тебе важно.": "How this option is good for what matters to you.",
  "Какие минусы?": "What are the cons?",
  "какие минусы?": "what are the cons?",
  "Чем этот вариант плох и чего он будет стоить.": "What is bad about this option and what it will cost.",
  "Что выбираю?": "What do I choose?",
  "Какой вариант и почему. И первый шаг.": "Which option and why. And the first step.",
  "Решить проблему": "Solve a problem",
  "Не получается…, как…": "I can't…, how do I…",
  "Проблема": "Problem",
  "В чём именно проблема?": "What exactly is the problem?",
  "Что происходит и чем это мешает. Конкретно, с примером.": "What is happening and why it gets in the way. Be specific, with an example.",
  "Причины": "Causes",
  "По одной причине. На каждую можно спросить «почему» ещё раз плюсом под блоком.": "One cause at a time. You can ask “why” again on any of them with the plus below it.",
  "Способы": "Ways",
  "Что можно сделать?": "What could be done?",
  "Все способы подряд, даже странные. Выбирать будешь на следующем шаге.": "Every way you can think of, even odd ones. You'll choose in the next step.",
  "Первый шаг": "First step",
  "Что сделаю первым?": "What will I do first?",
  "Одно небольшое действие и когда именно.": "One small action, and exactly when.",

  // Разбор темы
  "Разобрать тему": "Study a topic",
  "Понять, выучить, объяснить": "Understand, learn, explain",
  "Что это": "What it is",
  "Что это такое?": "What is it?",
  "Своими словами, как объяснить другу.": "In your own words, as you would explain it to a friend.",
  "Зачем это": "Why it matters",
  "Где это нужно: на экзамене, в работе, в жизни.": "Where you need it: in exams, at work, in life.",
  "Как устроено": "How it works",
  "Из чего состоит?": "What is it made of?",
  "Главные части или шаги, по одному. Каждый можно развернуть плюсом под блоком.": "The main parts or steps, one at a time. Expand any of them with the plus below it.",
  "Примеры": "Examples",
  "Конкретный случай, задача или пример из жизни.": "A concrete case, a problem, or an everyday example.",
  "Связи": "Connections",
  "С чем это связано?": "What is it connected to?",
  "С какими темами, которые ты уже знаешь, это связано и чем отличается.": "Topics you already know that relate to this, and how it differs from them.",
  "Что непонятно": "Open questions",
  "Что пока непонятно?": "What is still unclear?",
  "Вопросы, на которые ещё нет ответа. Их стоит разобрать дальше или спросить.": "Questions you can't answer yet. Dig into them next, or ask someone.",

  // Общие разделы дебатов
  "Определения": "Definitions",
  "Что значат слова?": "What do the words mean?",
  "Что значат ключевые слова резолюции?": "What do the key words of the motion mean?",
  "По одному слову. Например: «романтизация: показывать только хорошую сторону».": "One word at a time. For example: “romanticization: showing only the good side”.",
  "Бремя": "Burden",
  "Что доказать?": "What must be proven?",
  "Фрейм": "Frame",
  "В каком мире спор?": "What world is the debate in?",
  "Фрейм: что происходит сейчас и в чём проблема?": "Frame: what is happening now, and what is the problem?",
  "По одной мысли. Строй так, чтобы было выгодно твоей стороне, но честно: идеальный мир судья не примет.": "One thought at a time. Frame it in your side's favour, but honestly: judges won't accept a perfect world.",
  "Кого это задевает сильнее всего?": "Who does this affect most?",
  "Группы, для которых изменится больше всего: бедные, женщины, дети, меньшинства.": "The groups for whom the most changes: the poor, women, children, minorities.",
  "Участники": "Actors",
  "Кого это затрагивает?": "Who does this affect?",
  "По одному участнику. Например: матери, дети, государство.": "One actor at a time. For example: mothers, children, the state.",
  "что получает?": "what do they gain?",
  "Что этому участнику выгодно, если резолюция принята.": "What this actor gains if the motion passes.",
  "что теряет?": "what do they lose?",
  "Чем этот участник платит, если резолюция принята.": "What this actor pays if the motion passes.",
  "Правительство": "Government",
  "Почему да?": "Why yes?",
  "Оппозиция": "Opposition",
  "Почему нет?": "Why no?",
  "Расширение": "Extension",
  "Что нового?": "What is new?",
  "Расширение: что нового скажешь ты?": "Extension: what new will you bring?",
  "То, чего не скажет первый стол. Где искать: другой участник, другой мотив, долгий срок, уязвимая группа, принцип вместо практики.": "What the opening bench won't say. Where to look: another actor, another motive, the long term, a vulnerable group, principle instead of practice.",
  "Столкновение": "Clash",
  "Где главный спор?": "Where is the main clash?",
  "Где главное столкновение сторон?": "Where do the sides clash most?",
  "В чём стороны не согласны по сути. Обычно это и решает раунд.": "Where the sides really disagree. This usually decides the round.",
  "По одному аргументу. Развить каждый можно потом плюсом под блоком.": "One argument at a time. You can develop each one later with the plus below it.",
  "Аргументы соперника, по одному. Потом ответишь на каждый.": "The other side's arguments, one at a time. You'll respond to each one later.",
  "Аргументы Правительства: почему да?": "Government arguments: why yes?",
  "Твои аргументы: почему да?": "Your arguments: why yes?",
  "Что скажет Правительство: почему да?": "What will Government say: why yes?",
  "Аргументы Оппозиции: почему нет?": "Opposition arguments: why no?",
  "Что скажет Оппозиция: почему нет?": "What will Opposition say: why no?",
  "Твои аргументы: почему нет?": "Your arguments: why no?",
  "Что скажет первый стол твоей стороны?": "What will the opening bench on your side say?",
  "Аргументы, которые, скорее всего, возьмёт открывающая команда. Повторять их нельзя: твоё пойдёт в расширение.": "Arguments the opening team will most likely take. You can't repeat them: yours go into the extension.",
  "Бремя: что нужно доказать твоей стороне?": "Burden: what does your side need to prove?",
  "Бремя: что нужно доказать каждой стороне?": "Burden: what does each side need to prove?",
  "Правительству: {gov} Оппозиции: {opp}": "Government: {gov} Opposition: {opp}",
  "Твоя линия: что защищает Оппозиция?": "Your line: what does the Opposition defend?",
  "Линия Оппозиции: что она защищает?": "Opposition line: what does it defend?",
  "Ответ на {quote}": "Reply to {quote}",
  "{team} отвечает на {quote}": "{team} replies to {quote}",
  "Почему это неверно, не так важно или даже помогает тебе. Можно несколько ответов.": "Why it is wrong, matters less, or even helps you. You can add several replies.",
  "Почему это неверно, не так важно или даже помогает другой стороне. Можно несколько ответов.": "Why it is wrong, matters less, or even helps the other side. You can add several replies.",

  // Таймер подготовки
  "определениям, бремени и фрейму": "definitions, burden and frame",
  "участникам": "actors",
  "аргументам": "arguments",
  "ответам и столкновению": "replies and clash",
  "пора к {stage}": "move on to {stage}",

  // План речи
  "план речи": "speech plan",
  "**Резолюция:** {text}": "**Motion:** {text}",
  "**Позиция:** {pos}": "**Position:** {pos}",
  "ещё не выбрана": "not chosen yet",
  "**Что доказываем:** {text}": "**What we prove:** {text}",
  "> Собрано из дерева «{title}». Меняй дерево: правки здесь пропадут при следующей сборке.": "> Built from the tree “{title}”. Edit the tree: changes made here are lost on the next build.",
  "# За Оппозицию (первый стол)": "# For the Opposition (opening bench)",
  "# За Правительство (первый стол)": "# For the Government (opening bench)",
  "_не заполнено_": "_not filled in_",
  "Почему правда": "Why it is true",
  "Пример": "Example",
  "К чему ведёт": "Impact",
  "Почему важнее": "Why it outweighs",
  "На «{arg}»: {text}": "To “{arg}”: {text}",
  "Сильнее всего задевает: {who}": "Affects most: {who}",
  "## Первый спикер": "## First speaker",
  "Ответ соперникам": "Rebuttal",
  "Первый стол уже скажет, не повторять": "The opening bench will already say this; don't repeat it",
  "**Расширение**": "**Extension**",
  "_Расширения пока нет: добавь его в разборе._": "_No extension yet: add one in the breakdown._",
  "## Второй спикер": "## Second speaker",
  "Главные споры": "Main clashes",
  "_Без новых аргументов. Покажи, почему ваша команда лучше трёх остальных._": "_No new arguments. Show why your team beats the other three._",
  "Наша линия": "Our line",
  "Ответ Правительству": "Reply to the Government",
  "Ответ Оппозиции": "Reply to the Opposition",
  "Ответ на новое от Правительства": "Reply to anything new from the Government",
  "запиши во время раунда": "note it down during the round",
  "**Аргументы:** {list}": "**Arguments:** {list}",
  "_Новых аргументов нет: углуби первые через ещё одно «почему правда?» или импакт._": "_No new arguments: deepen the first ones with another “why is it true?” or an impact._",
  "Главный спор": "Main clash",

  // Тренажёр
  "Тренировки": "Debate practice",
  "Тренировка {stamp}": "Practice {stamp}",
  "О чём спор": "The debate",
  "Пора выписывать идеи": "Time to list ideas",
  "Все идеи": "All ideas",
  "Пора писать лист речи": "Time to write the speech sheet",
  "Лист речи": "Speech sheet",
  "Слова: что значат": "Words: what they mean",
  "Ключевые слова резолюции и что ты под ними понимаешь": "The key words of the motion and what you take them to mean",
  "Что нам надо доказать": "What we must prove",
  "Одной фразой": "In one sentence",
  "Кто выигрывает": "Who wins",
  "Кого это касается и что они получат": "Who is affected and what they gain",
  "Кто теряет": "Who loses",
  "Кого задевает сильнее всего": "Who is hit hardest",
  "За нашу сторону": "For our side",
  "Одна идея — одна строка, 2–4 слова. Без отбора: лучшие станут аргументами.": "One idea per line, 2–4 words. Don't filter yet: the best ones become arguments.",
  "Что скажут против → чем ответим": "What they will say → our reply",
  "Одна строка — один их довод и твой ответ": "One line per point of theirs, with your reply",
  "Тезис": "Claim",
  "Одна фраза целиком": "One full sentence",
  "Шаг → шаг → вывод": "Step → step → conclusion",
  "2–3 слова": "2–3 words",
  "Для кого и что изменится": "For whom, and what changes",
  "Чем это весомее, чем у соперника": "Why this weighs more than the other side",
  "Время подготовки вышло: переходи к речи.": "Prep time is up: move on to your speech.",
  "{next}: прошло {min} мин.": "{next}: {min} min have passed.",
  "Вступление": "Opening",
  "Одна фраза целиком: о чём твоя речь": "One full sentence: what your speech is about",
  "Что значат слова резолюции и что именно вы предлагаете": "What the words of the motion mean and exactly what you propose",
  "2–3 главных: что они сказали → чем ответишь. Можно дописать во время раунда.": "The 2–3 main ones: what they said → your reply. You can add to this during the round.",
  "Аргумент 1": "Argument 1",
  "Расширение: то, чего точно не скажет первый стол": "Extension: something the opening bench surely won't say",
  "Самый сильный": "Your strongest",
  "Аргумент 2": "Argument 2",
  "Ещё одна сторона расширения или его углубление": "Another side of the extension, or a deeper take on it",
  "Второй по силе": "Your second strongest",
  "Вывод": "Closing",
  "Одна фраза целиком: почему вы выиграли": "One full sentence: why you won",
  "{spent} из {limit}": "{spent} of {limit}",
  "**Резолюция:** {motion}": "**Motion:** {motion}",
  "**Позиция:** {short}, {name}": "**Position:** {short}, {name}",
  "подготовка {time}": "prep {time}",
  "подготовка идёт": "prep in progress",
  "речь {time}": "speech {time}",
  "**Время:** {list}": "**Time:** {list}",
  "## Лист речи": "## Speech sheet",
  "## Подготовка": "## Prep",
  "{part}: {field}": "{part}: {field}",

  // Подсказки и справка
  "Напиши мысль и нажми кнопку справа внизу на клавиатуре: следующий блок начнётся сам. Для решений, учёбы и дебатов есть «Разбор» внизу.": "Type a thought and press the bottom-right key on the keyboard: the next block starts by itself. For decisions, studying and debates, use “Guide” at the bottom.",
  "Плюс снизу начинает следующий блок, плюс справа начинает блок рядом. Удержи блок, чтобы перенести его.": "The plus below starts the next block, the plus on the right starts one beside it. Press and hold a block to move it.",
  "Нажми на блок: снизу и справа появятся плюсы, слева значок сворачивания ветки.": "Tap a block: pluses appear below and to the right, and a collapse button on the left.",
  "Кнопка справа внизу на клавиатуре сохраняет блок и сразу начинает следующий. «Рядом» начинает соседний блок.": "The bottom-right key on the keyboard saves the block and starts the next one. “Beside” starts a sibling block.",
  "Вопрос на стрелке подбирается сам и учится на твоих исправлениях. Нажми на подпись стрелки, чтобы увидеть все вопросы сразу. На ПК вопрос выбирается цифрой, а во время ввода клавишей Alt с цифрой.": "The question on each arrow is picked for you and learns from your corrections. Tap an arrow label to see all questions. On desktop, pick a question with a digit key, or Alt plus a digit while typing.",
  "Разбор: выбери «Решение», «Тему» или «Дебаты» и напиши свой вопрос, тему или резолюцию. Плагин построит каркас и спросит по шагам.": "Guide: choose “Decision”, “Topic” or “Debate” and write your question, topic or motion. The plugin builds a skeleton and walks you through it step by step.",
  "В дебатах выбери позицию (ОП, ОО, ЗП, ЗО): твоя сторона жёлтая, соперник синий, а на каждый его аргумент будет шаг «Чем ответить?». Наверху идёт таймер на 15 минут подготовки.": "In a debate, pick your position (OG, OO, CG, CO): your side is yellow, the other side blue, and each of their arguments gets a “How to respond?” step. A 15-minute prep timer runs at the top.",
  "Каждый твой аргумент разбирается по FRIC: почему правда, пример, к чему ведёт, почему важнее. Буквы Р И С на блоке аргумента горят, когда звено заполнено. У ЗП и ЗО есть раздел «Расширение»: то новое, чего не скажет первый стол.": "Each of your arguments is built step by step: why it is true, an example, the impact, why it outweighs. The letters R I C on an argument light up as those links are filled in. CG and CO get an “Extension” section: what the opening bench won't say.",
  "План речи в меню с тремя точками собирает дерево в заметку по спикерам. По ней удобно говорить с телефона.": "“Speech plan” in the three-dot menu turns the tree into a note split by speaker, easy to speak from on a phone.",
  "Тренировка открывается значком таймера: на телефоне он в меню действий (кнопка с тремя полосками внизу), на ПК на левой панели. Там случайная резолюция, 15 минут подготовки по шагам и 7 минут речи. Каждая тренировка сохраняется заметкой в папке «Тренировки».": "Debate practice opens from the timer icon: on a phone it is in the actions menu (the three-line button at the bottom), on desktop in the left ribbon. You get a random motion, 15 minutes of guided prep and a 7-minute speech. Each session is saved as a note in the “Debate practice” folder.",
  "Повторное нажатие на выбранный блок открывает правку текста.": "Tap a selected block again to edit its text.",
  "Удержи блок и перетащи: на середину другого блока, чтобы поставить под него, на его край, чтобы поставить рядом.": "Press, hold and drag a block: onto the middle of another block to put it underneath, onto its edge to put it beside.",
  "Кнопка «Оппонент» перекрашивает блок вместе с веткой. «Ответить» у блока соперника начинает твой ответ на него. «Свести» соединяет несколько веток в один блок.": "“Opponent” recolours a block together with its branch. “Reply” on the other side's block starts your answer to it. “Merge” joins several branches into one block.",
  "Экспорт в PDF находится в меню с тремя точками в правом верхнем углу. Файл появится рядом со схемой, в нём всё дерево целиком на белом фоне.": "“Export to PDF” is in the three-dot menu at the top right. The file appears next to the tree and shows the whole tree on a white background.",

  // Вид разбора, позиции, буквы FRIC
  "Тема": "Topic",
  "Дебаты": "Debate",
  "Не знаю": "Not sure",
  "Готовлюсь к обеим сторонам": "Preparing both sides",
  "Р": "R",
  "почему правда": "why it is true",
  "И": "I",
  "к чему ведёт": "impact",
  "С": "C",
  "почему важнее": "why it outweighs",

  // Схема
  "Добавить блок ниже": "Add block below",
  "Добавить блок рядом": "Add block beside",
  "Свернуть или развернуть ветку": "Collapse or expand branch",
  "Здесь пока пусто. Нажми «Тезис», чтобы начать схему, или значок со списком, чтобы разобрать решение, тему или резолюцию.": "Nothing here yet. Tap “Idea” to start a tree, or the list icon to work through a decision, a topic or a motion.",
  "Этот файл не читается как дерево, поэтому плагин его не меняет. Открой его в другом приложении или верни прошлую версию через «Восстановление файлов» в настройках Obsidian.": "This file can't be read as a tree, so the plugin leaves it untouched. Open it in another app, or restore an earlier version with “File recovery” in Obsidian settings.",
  "Закрыть подсказку": "Close tip",
  "Все вопросы": "All questions",
  "Свой вопрос": "Your own question",
  "Рядом": "Beside",
  "Разбор": "Guide",
  "Как пользоваться": "How to use",
  "Закрыть справку": "Close help",
  "Вопрос на стрелке": "Arrow question",
  "Закрыть": "Close",
  "Без вопроса": "No question",
  "Предыдущий шаг": "Previous step",
  "Отменить последнее": "Undo last",
  "Закрыть разбор": "Close guide",
  "Что разбираем": "What to work through",
  "Критерии сравнения": "Weighing criteria",
  "Добавить блок": "Add block",
  "Дальше": "Next",
  "Не хватает: {list}": "Missing: {list}",
  "Все звенья FRIC на месте": "All argument links are in place",
  "Развернуть ветку": "Expand branch",
  "Отметь блоки, которые сходятся в один": "Mark the blocks that merge into one",
  "Нажми блок, куда провести стрелку. Если стрелка уже есть, она уберётся": "Tap the block to draw an arrow to. If the arrow already exists, it is removed",
  "Назад": "Undo",
  "Фокус на ветке": "Focus on branch",
  "Вся схема": "Whole tree",
  "Тезис|кнопка": "Idea",
  "Новый тезис": "New idea",
  "Отмена": "Cancel",
  "Свести ({n})": "Merge ({n})",
  "Моя сторона": "My side",
  "Оппонент": "Opponent",
  "Ответить": "Reply",
  "Свести": "Merge",
  "Связать": "Link",
  "Ещё": "More",
  "Сейчас блок оппонента, сделать своим": "Opponent's block now; make it yours",
  "Сейчас мой блок, сделать блоком оппонента": "Your block now; make it the opponent's",
  "Свой…": "Custom…",
  "Следующий блок": "Next block",
  "Главный тезис": "Main idea",
  "Текст блока": "Block text",
  "Какой вопрос решаешь?": "What are you deciding?",
  "Напиши его целиком. Например: Переводиться ли в другой вуз?": "Write the whole question. For example: Should I switch universities?",
  "Стоит ли…": "Should I…",
  "Какую тему разбираешь?": "What topic are you studying?",
  "Напиши её коротко. Например: Цикл Кребса.": "Write it briefly. For example: The Krebs cycle.",
  "Тема…": "Topic…",
  "Какая резолюция?": "What is the motion?",
  "Напиши её целиком. Например: ЭП сожалеет о романтизации материнства.": "Write it in full. For example: This House regrets the romanticization of motherhood.",
  "ЭП…": "This House…",
  "Какое это решение?": "What kind of decision is it?",
  "Какой это тип резолюции?": "What type of motion is it?",
  "Похоже на «{name}». Если это не так, нажми другой вариант.": "Looks like “{name}”. If not, tap another option.",
  "Какая у тебя позиция?": "What is your position?",
  "Твоя сторона будет жёлтой, соперник синим. У второго стола появится расширение. Позицию можно сменить в любой момент.": "Your side will be yellow, the other side blue. Closing benches get an extension. You can change your position at any time.",
  "Шаг {n} из {total}": "Step {n} of {total}",
  "Обе": "Both",
  "обе стороны": "both sides",
  "Добавлено: {n}. Ещё один?": "Added: {n}. Another one?",
  "Ответ станет блоком": "Your answer becomes a block",
  "Добавлено: {n}": "Added: {n}",
  "Готово": "Done",
  "Твоя позиция: {side}. Сменить": "Your position: {side}. Change",
  "Время подготовки вышло. План речи в меню ⋮.": "Prep time is up. The speech plan is in the ⋮ menu.",
  "Время идёт быстрее: {label}.": "Time is running ahead of you: {label}.",
  "Разбор собран. План речи открывается в меню ⋮ вверху.": "Guide complete. Open the speech plan from the ⋮ menu at the top.",
  "Разбор собран. Любой блок можно развить плюсом под ним.": "Guide complete. Develop any block with the plus below it.",
  "План речи собирается из разбора резолюции. Начни «Разбор» в меню ⋮.": "The speech plan is built from a debate guide. Start “Guide” from the ⋮ menu.",
  "Logic Tree: план речи": "Logic Tree: speech plan",
  "Не получилось собрать план речи.": "Couldn't build the speech plan.",
  "Изменить текст": "Edit text",
  "Связать стрелкой": "Link with an arrow",
  "Ответить на блок": "Reply to block",
  "Экспорт в PDF": "Export to PDF",
  "Удалить блок": "Delete block",
  "Удалить ветку": "Delete branch",
  "Удалено блоков: {n}. Кнопка «Назад» вернёт их.": "Blocks deleted: {n}. “Undo” brings them back.",
  "Такая стрелка замкнёт схему в круг, поэтому её нельзя провести": "This arrow would create a loop, so it can't be drawn",
  "План речи": "Speech plan",
  "В схеме пока нет блоков, сохранять нечего": "The tree has no blocks yet, nothing to save",
  "PDF сохранён рядом со схемой: {name}": "PDF saved next to the tree: {name}",
  "Logic Tree: экспорт в PDF": "Logic Tree: PDF export",
  "Не получилось сохранить PDF. Если схема очень большая, попробуй экспорт на компьютере.": "Couldn't save the PDF. If the tree is very large, try exporting on a computer.",
  "Дерево {n}": "Tree {n}",

  // Вкладка тренажёра
  "Тренировка": "Practice",
  "Открыть заметку": "Open note",
  "Новая тренировка": "New practice",
  "Резолюции": "Motions",
  "Напиши резолюцию или нажми «Другая».": "Write a motion or tap “Another”.",
  "Logic Tree: заметка тренировки": "Logic Tree: practice note",
  "Не получилось сохранить заметку тренировки. Записи остаются в тренажёре.": "Couldn't save the practice note. Your notes stay in the trainer.",
  "Заметка тренировки ещё не создана.": "The practice note hasn't been created yet.",
  "15 минут подготовки и 7 минут речи, как на турнире. Всё сохранится заметкой в папке «Тренировки».": "15 minutes of prep and a 7-minute speech, as at a tournament. Everything is saved as a note in the “Debate practice” folder.",
  "Резолюция": "Motion",
  "Другая резолюция": "Another motion",
  "Свои резолюции: создай заметку «Резолюции» и пиши по одной в строке.": "Your own motions: create a note called “Motions” with one motion per line.",
  "Позиция": "Position",
  "Начать: 15 минут подготовки": "Start: 15 minutes of prep",
  "Дальше: {title}": "Next: {title}",
  "Перейти к речи": "Go to speech",
  "Взять из идей": "Pick from ideas",
  "Закончить речь": "End speech",
  "Начать речь: 7 минут": "Start speech: 7 minutes",
  "Тезис не записан": "No claim written",
  "Пусто": "Empty",
  "Назад к подготовке": "Back to prep",
  "Тренировка закончена": "Practice complete",
  "дольше на {time}": "over by {time}",
  "Подготовка": "Prep",
  "Речь": "Speech",
  "Осталось пустым": "Left empty",
  "Все главные звенья заполнены.": "All key links are filled in.",
  "Осталось {time} из 15 минут": "{time} left of 15 minutes",
  "Лист речи. Встань и нажми, когда начнёшь говорить.": "Speech sheet. Stand up and tap when you start speaking.",
  "Время вышло: заканчивай фразу.": "Time is up: finish your sentence.",
  "Сейчас: {part}": "Now: {part}",

  // Команды и настройки
  "Новое дерево": "New tree",
  "Тренировка дебатов": "Debate practice",
  "Разбор решения, темы или резолюции": "Guide through a decision, topic or motion",
  "Язык": "Language",
  "Язык интерфейса плагина. Действует на вкладки, открытые после смены.": "The plugin's interface language. Applies to tabs opened after the change.",
  "Как в Obsidian": "Same as Obsidian",
};

// Обратная карта только для вопросов на стрелках (и «Да» с «Нет»): по ней вопрос узнаётся на любом языке.
const REV = {};
Object.keys(EN).forEach(ru => {
  if (ru.endsWith('?') || ru === 'Да' || ru === 'Нет') REV[EN[ru]] = ru;
});
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
let LANG = 'en';

// Ключ может нести пометку «|контекст», если одно русское слово переводится по-разному.
function tr(text, vars) {
  let s = LANG === 'en' && has(EN, text) ? EN[text] : text.split('|')[0];
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (has(vars, k) ? String(vars[k]) : m));
  return s;
}

const deepTr = v => {
  if (typeof v === 'string') return tr(v);
  if (Array.isArray(v)) return v.map(deepTr);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepTr(x)]));
  return v;
};
const canonQ = q => (has(REV, q) ? REV[q] : q);
const sameQ = (a, b) => canonQ(a || '') === canonQ(b || '');

// «Авто» и всё неизвестное следуют языку Obsidian, а он по умолчанию английский.
function languageFor(setting, obsidianLang) {
  if (setting === 'en' || setting === 'ru') return setting;
  return /^ru\b/i.test(obsidianLang || '') ? 'ru' : 'en';
}

// Таблицы ниже хранятся по-русски (*_RU), а setLanguage собирает их копии на выбранном языке.
let QUESTIONS, CHAIN, CRITERIA, FRIC_LINKS, POSITIONS, MOTION_TYPES, LIFE_TYPES, STUDY_TYPES, TYPES;
let SECTIONS_BEFORE, SECTIONS_AFTER, ARGUMENT_TEXT, OPENING_TEXT, TEAM_NAME, PREP_STAGES;
let TRAIN_MOTIONS, TRAIN_FOLDER, TRAIN_TABS, TRAIN_FIELDS, ARG_FIELDS;
let TIP_START, TIP_SELECT, HELP_LINES, KINDS, POSITION_CHOICES, RIC;


const VIEW_TYPE = 'logic-tree-view';
const EXTENSION = 'tree';
const QUESTIONS_RU = [
  'Что происходит?',
  'Почему так происходит?',
  'Что это значит?',
  'Что именно?',
  'К чему это приводит?',
  'Почему это важно?',
  'Что с этим делать?',
  'Да',
  'Нет',
];
// Обычный ход рассуждения: по нему подбирается вопрос для следующей стрелки.
const CHAIN_RU = [
  'Что происходит?',
  'Почему так происходит?',
  'Что это значит?',
  'К чему это приводит?',
  'Почему это важно?',
  'Что именно?',
  'Что с этим делать?',
];
const NODE_W = 160;
const WIDE_TEXT = 60;
const SHORT_TEXT = 14;
const FONT_SIZES = [16, 13, 11];
const DUMMY_W = 12;
const GAP_X = 14;
const CHANNEL = 10;
const MARGIN = 28;
const STUB_TOP = 16;
const STUB_TOP_LABEL = 44;
const STUB_BOTTOM = 22;
const STUB_BOTTOM_LABEL = 48;

const emptyDoc = () => ({ version: 2, nextId: 1, nodes: [], edges: [] });
const hasEdge = (doc, a, b) => doc.edges.some(e => e[0] === a && e[1] === b);
const parentsOf = (doc, id) => doc.edges.filter(e => e[1] === id).map(e => e[0]);
const childrenOf = (doc, id) => doc.edges.filter(e => e[0] === id).map(e => e[1]);
const blockOf = (doc, id) => doc.nodes.find(n => n.id === id);

function walk(doc, start, next) {
  const seen = new Set();
  const stack = [...start];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    next(doc, id).forEach(n => stack.push(n));
  }
  return seen;
}

const reaches = (doc, from, to) => walk(doc, [from], childrenOf).has(to);

// Блок виден, если к нему можно прийти от тезиса, не проходя через свёрнутый блок.
function visibleIds(doc) {
  const collapsed = new Set(doc.nodes.filter(n => n.collapsed).map(n => n.id));
  const withParent = new Set(doc.edges.map(e => e[1]));
  const roots = doc.nodes.filter(n => !withParent.has(n.id)).map(n => n.id);
  return walk(doc, roots, (d, id) => (collapsed.has(id) ? [] : childrenOf(d, id)));
}

const hiddenCount = (doc, id, visible) => [...walk(doc, [id], childrenOf)].filter(x => !visible.has(x)).length;

const focusIds = (doc, ids) => new Set([...walk(doc, ids, parentsOf), ...walk(doc, ids, childrenOf)]);

function addBlock(doc, { parents, text, q, side, after }) {
  const id = `n${doc.nextId++}`;
  const block = { id, text, q: parents.length ? q || '' : '' };
  if (side === 'o') block.side = 'o';
  const at = after && !parents.length ? doc.nodes.findIndex(n => n.id === after) : -1;
  if (at >= 0) doc.nodes.splice(at + 1, 0, block);
  else doc.nodes.push(block);
  parents.forEach(p => insertEdge(doc.edges, p, id, after));
  return id;
}

// Порядок стрелок задаёт порядок веток слева направо.
function insertEdge(edges, parent, child, after) {
  const at = after ? edges.findIndex(e => e[0] === parent && e[1] === after) : -1;
  if (at >= 0) edges.splice(at + 1, 0, [parent, child]);
  else edges.push([parent, child]);
}

function removeBlock(doc, id) {
  const ups = parentsOf(doc, id);
  const downs = childrenOf(doc, id);
  const edges = [];
  doc.edges.forEach(e => {
    if (e[0] === id) return;
    if (e[1] !== id) {
      edges.push(e);
      return;
    }
    downs.forEach(d => {
      if (!hasEdge(doc, e[0], d) && !edges.some(x => x[0] === e[0] && x[1] === d)) edges.push([e[0], d]);
    });
  });
  doc.nodes = doc.nodes.filter(n => n.id !== id);
  doc.edges = edges;
  return ups[0] || downs[0] || null;
}

function removeBranch(doc, id) {
  const next = parentsOf(doc, id)[0] || null;
  const under = [...walk(doc, [id], childrenOf)];
  const gone = new Set([id]);
  for (let changed = true; changed;) {
    changed = false;
    for (const x of under) {
      if (!gone.has(x) && parentsOf(doc, x).every(p => gone.has(p))) {
        gone.add(x);
        changed = true;
      }
    }
  }
  doc.nodes = doc.nodes.filter(n => !gone.has(n.id));
  doc.edges = doc.edges.filter(e => !gone.has(e[0]) && !gone.has(e[1]));
  return { next, removed: gone.size };
}

function canMove(doc, id, target, zone) {
  if (id === target || !blockOf(doc, target)) return false;
  const newParents = zone === 'child' ? [target] : parentsOf(doc, target);
  return newParents.every(p => !reaches(doc, id, p));
}

function moveBlock(doc, id, target, zone) {
  if (!canMove(doc, id, target, zone)) return false;
  doc.edges = doc.edges.filter(e => e[1] !== id);
  if (zone === 'child') {
    doc.edges.push([target, id]);
    return true;
  }
  const block = blockOf(doc, id);
  const parents = parentsOf(doc, target);
  const shift = zone === 'after' ? 1 : 0;
  block.q = parents.length ? blockOf(doc, target).q : '';
  if (!parents.length) {
    doc.nodes = doc.nodes.filter(n => n !== block);
    doc.nodes.splice(doc.nodes.findIndex(n => n.id === target) + shift, 0, block);
    return true;
  }
  parents.forEach(p => {
    doc.edges.splice(doc.edges.findIndex(e => e[0] === p && e[1] === target) + shift, 0, [p, id]);
  });
  return true;
}

function setSide(doc, id, side) {
  const branch = walk(doc, [id], childrenOf);
  doc.nodes.forEach(n => {
    if (!branch.has(n.id)) return;
    if (side === 'o') n.side = 'o';
    else delete n.side;
  });
}

const own = (object, key) => (Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined);

function chainNext(prev) {
  if (!prev) return CHAIN[0];
  const at = CHAIN_RU.indexOf(canonQ(prev));
  return at < 0 ? tr('Что это значит?') : CHAIN[Math.min(at + 1, CHAIN.length - 1)];
}

// Сначала то, что ты сам чаще ставишь после этого вопроса, при равенстве побеждает обычная цепочка.
function rankQuestions(prev, stats, extra) {
  const learned = own(stats, prev) || {};
  const next = chainNext(prev);
  const score = q => (own(learned, q) || 0) + (q === next ? 0.5 : 0);
  return [...new Set([next, ...QUESTIONS, ...extra, ...Object.keys(learned)])]
    .map((q, i) => [q, score(q), i])
    .sort((a, b) => b[1] - a[1] || a[2] - b[2])
    .map(x => x[0]);
}

function recordTransition(stats, prev, q) {
  if (!q || prev === '__proto__' || q === '__proto__') return;
  if (!own(stats, prev)) stats[prev] = {};
  stats[prev][q] = (own(stats[prev], q) || 0) + 1;
}

const questionChoices = (current, prev, stats, extra) => {
  const ranked = rankQuestions(prev, stats, extra);
  return current ? [current, ...ranked.filter(q => q !== current)] : ranked;
};

// ---------- Разбор: дебаты и жизненные решения ----------

const GAIN_Q = 'Что получает?';
const LOSE_Q = 'Что теряет?';
const STANCE_Q = 'Что защищает?';
const REPLY_Q = 'Чем ответить?';
// Звенья аргумента по системе FRIC: ризонинг, пример, импакт, сравнение.
const WHY_Q = 'Почему правда?';
const EXAMPLE_Q = 'Например?';
const IMPACT_Q = 'К чему ведёт?';
const WEIGH_Q = 'Почему важнее?';
const WHO_Q = 'Кого задевает сильнее?';
const CRITERIA_RU = ['Вероятность', 'Масштаб', 'Критичность', 'Меньшинства', 'Необратимость'];
const FRIC_LINKS_RU = [
  { key: 'why', q: WHY_Q, ask: 'почему это правда?', hint: 'Цепочка от тезиса к результату, по одному звену. Сначала логика, пример будет на следующем шаге.' },
  { key: 'example', q: EXAMPLE_Q, ask: 'какой пример?', hint: 'Случай из жизни, который подтверждает логику. Можно пропустить: нажми «Дальше».' },
  { key: 'impact', q: IMPACT_Q, ask: 'к чему ведёт и для кого?', hint: 'Что меняется в жизни людей и для кого именно, особенно для уязвимых групп. Без преувеличений.' },
  { key: 'weigh', q: WEIGH_Q, ask: 'почему это важнее?', hint: 'Почему это перевешивает соперника. Нажми критерий или напиши свой.', chips: CRITERIA_RU },
];
const FRIC_TEXT = 40;

// Позиции британского формата: два стола за Правительство и два за Оппозицию.
const POSITIONS_RU = [
  ['og', 'ОП', 'Открывающее Правительство', 'Первый стол за'],
  ['oo', 'ОО', 'Открывающая Оппозиция', 'Первый стол против'],
  ['cg', 'ЗП', 'Закрывающее Правительство', 'Второй стол за'],
  ['co', 'ЗО', 'Закрывающая Оппозиция', 'Второй стол против'],
];
const validPos = pos => (POSITIONS.some(p => p[0] === pos) ? pos : '');
const teamOf = pos => ({ og: 'gov', cg: 'gov', oo: 'opp', co: 'opp' })[validPos(pos)] || '';
const isClosing = pos => pos === 'cg' || pos === 'co';
const posInfo = pos => POSITIONS.find(p => p[0] === pos);

// Типы резолюций парламентских дебатов. У каждого свои разделы между общими
// и своя подсказка о том, что защищает Оппозиция.
const MOTION_TYPES_RU = {
  policy: {
    name: 'Действие',
    lead: 'ЭП запретит, введёт, ограничит',
    line: 'Оставить всё как есть или предложить свой вариант вместо этой меры. Одной фразой.',
    burden: ['Проблема есть, и мера решает её лучше, чем если оставить всё как есть.', 'Мера не сработает, навредит больше, чем поможет, или есть способ лучше.'],
    sections: [
      { key: 'mechanism', title: 'Механизм', q: 'Как это будет работать?', hint: 'Кто вводит меру, как именно, что будет за нарушение.' },
    ],
  },
  regret: {
    name: 'Сожаление',
    lead: 'ЭП сожалеет о…',
    line: 'Чем мир с этим явлением лучше, чем мир без него. Одной фразой.',
    burden: ['Без этого явления мир был бы лучше.', 'С этим явлением мир лучше или хотя бы не хуже.'],
    sections: [
      { key: 'now', title: 'Сейчас', q: 'Что происходит сейчас?', hint: 'Опиши явление, о котором сожалеет палата, и к чему оно приводит.' },
      { key: 'without', title: 'Мир без этого', q: 'Каким был бы мир без этого?', hint: 'Что было бы вместо этого явления. С этим миром сравнивают обе стороны.' },
    ],
  },
  value: {
    name: 'Оценка',
    lead: 'ЭП считает, что…',
    line: 'Какое утверждение Оппозиция защищает вместо этого. Одной фразой.',
    burden: ['Утверждение верно по самому важному критерию.', 'Утверждение неверно, или важнее другое.'],
    sections: [
      { key: 'criterion', title: 'Критерий', q: 'По какому критерию судить?', hint: 'Что здесь важнее всего: свобода, безопасность, благополучие, справедливость.' },
    ],
  },
  support: {
    name: 'Поддержка',
    lead: 'ЭП поддерживает, выступает против',
    line: 'Почему это не стоит поддерживать и что стоит поддержать вместо этого. Одной фразой.',
    burden: ['Это явление в целом приносит больше пользы, чем вреда.', 'Это явление приносит больше вреда, чем пользы.'],
    sections: [
      { key: 'what', title: 'Что поддерживаем', q: 'Как это выглядит в жизни?', hint: 'Кто и что делает, когда это явление есть. Конкретные примеры.' },
      { key: 'effects', title: 'Последствия', q: 'К чему это приводит?', hint: 'Что меняется для людей, когда этого становится больше.' },
    ],
  },
  prefer: {
    name: 'Сравнение',
    lead: 'ЭП предпочитает…',
    line: 'Второй вариант из сравнения: чем именно он лучше. Одной фразой.',
    burden: ['Первый вариант лучше по самому важному критерию.', 'Второй вариант лучше, или они равны.'],
    sections: [
      { key: 'options', title: 'Варианты', q: 'Что с чем сравниваем?', hint: 'Опиши оба варианта так, как они выглядят в жизни.' },
      { key: 'criterion', title: 'Критерий', q: 'По какому критерию выбирать?', hint: 'Что здесь важнее всего: свобода, безопасность, благополучие, справедливость.' },
    ],
  },
  actor: {
    name: 'От лица участника',
    lead: 'ЭП, будучи…',
    line: 'Как этому участнику лучше поступить вместо того, что предлагает резолюция. Одной фразой.',
    burden: ['Участнику выгоднее поступить так, как в резолюции.', 'Участнику выгоднее поступить иначе.'],
    sections: [
      { key: 'goals', title: 'Цели участника', q: 'Чего хочет этот участник?', hint: 'От чьего лица резолюция и что для него важнее всего.' },
      { key: 'options', title: 'Варианты', q: 'Какие у него варианты?', hint: 'Что он может сделать вместо того, что предлагает резолюция.' },
    ],
  },
};

// Разбор темы для учёбы: понять, выучить, объяснить.
const STUDY_TYPES_RU = {
  topic: {
    name: 'Разобрать тему',
    lead: 'Понять, выучить, объяснить',
    sections: [
      { key: 'what', title: 'Что это', q: 'Что это такое?', hint: 'Своими словами, как объяснить другу.' },
      { key: 'why', title: 'Зачем это', q: 'Почему это важно?', hint: 'Где это нужно: на экзамене, в работе, в жизни.' },
      { key: 'parts', title: 'Как устроено', q: 'Из чего состоит?', hint: 'Главные части или шаги, по одному. Каждый можно развернуть плюсом под блоком.' },
      { key: 'examples', title: 'Примеры', q: 'Например?', hint: 'Конкретный случай, задача или пример из жизни.' },
      { key: 'links', title: 'Связи', q: 'С чем это связано?', hint: 'С какими темами, которые ты уже знаешь, это связано и чем отличается.' },
      { key: 'gaps', title: 'Что непонятно', q: 'Что пока непонятно?', hint: 'Вопросы, на которые ещё нет ответа. Их стоит разобрать дальше или спросить.' },
    ],
  },
};

// Жизненные решения. Раздел с командой «opp» синий: это то, что говорит против.
const LIFE_TYPES_RU = {
  yesno: {
    name: 'Делать или нет',
    lead: 'Стоит ли…, идти ли…',
    sections: [
      { key: 'goal', title: 'Цель', q: 'Зачем мне это?', hint: 'Чего хочу добиться. Одной фразой.' },
      { key: 'pro', title: 'За', q: 'Что я получу?', hint: 'По одной выгоде: деньги, время, здоровье, учёба, отношения.', team: 'gov' },
      { key: 'con', title: 'Против', q: 'Что я потеряю?', hint: 'Чем придётся заплатить и что может пойти не так. По одному.', team: 'opp' },
      { key: 'worst', title: 'Худший случай', q: 'Что самое плохое может случиться?', hint: 'И можно ли будет это исправить.' },
      { key: 'decision', title: 'Решение', q: 'Что решаю?', hint: 'Да или нет, и первый шаг: что сделаю в ближайшие дни.' },
    ],
  },
  choice: {
    name: 'Выбор из вариантов',
    lead: 'Это или то, какой взять',
    sections: [
      { key: 'criteria', title: 'Что важно', q: 'Что для меня важно?', hint: 'По одному: деньги, время, здоровье, учёба, спокойствие.' },
      {
        key: 'options',
        title: 'Варианты',
        q: 'Какие есть варианты?',
        hint: 'По одному варианту. Потом спрошу плюсы и минусы каждого.',
        each: [
          { key: 'plus', q: 'Какие плюсы?', ask: 'какие плюсы?', hint: 'Чем этот вариант хорош для того, что тебе важно.', team: 'gov' },
          { key: 'minus', q: 'Какие минусы?', ask: 'какие минусы?', hint: 'Чем этот вариант плох и чего он будет стоить.', team: 'opp' },
        ],
      },
      { key: 'decision', title: 'Решение', q: 'Что выбираю?', hint: 'Какой вариант и почему. И первый шаг.' },
    ],
  },
  problem: {
    name: 'Решить проблему',
    lead: 'Не получается…, как…',
    sections: [
      { key: 'what', title: 'Проблема', q: 'В чём именно проблема?', hint: 'Что происходит и чем это мешает. Конкретно, с примером.' },
      { key: 'causes', title: 'Причины', q: 'Почему так происходит?', hint: 'По одной причине. На каждую можно спросить «почему» ещё раз плюсом под блоком.' },
      { key: 'ways', title: 'Способы', q: 'Что можно сделать?', hint: 'Все способы подряд, даже странные. Выбирать будешь на следующем шаге.' },
      { key: 'decision', title: 'Первый шаг', q: 'Что сделаю первым?', hint: 'Одно небольшое действие и когда именно.' },
    ],
  },
};
const kindOf = type => (own(LIFE_TYPES, type) ? 'life' : own(STUDY_TYPES, type) ? 'study' : 'debate');

const SECTIONS_BEFORE_RU = [
  { key: 'defs', title: 'Определения', q: 'Что значат слова?', prompt: 'Что значат ключевые слова резолюции?', hint: 'По одному слову. Например: «романтизация: показывать только хорошую сторону».' },
  { key: 'burden', title: 'Бремя', q: 'Что доказать?' },
  {
    key: 'frame',
    title: 'Фрейм',
    q: 'В каком мире спор?',
    prompt: 'Фрейм: что происходит сейчас и в чём проблема?',
    hint: 'По одной мысли. Строй так, чтобы было выгодно твоей стороне, но честно: идеальный мир судья не примет.',
    asks: [{ key: 'who', q: WHO_Q, prompt: 'Кого это задевает сильнее всего?', hint: 'Группы, для которых изменится больше всего: бедные, женщины, дети, меньшинства.' }],
  },
  {
    key: 'actors',
    title: 'Участники',
    q: 'Кого это затрагивает?',
    hint: 'По одному участнику. Например: матери, дети, государство.',
    each: [
      { key: 'gain', q: GAIN_Q, ask: 'что получает?', hint: 'Что этому участнику выгодно, если резолюция принята.', team: 'gov' },
      { key: 'lose', q: LOSE_Q, ask: 'что теряет?', hint: 'Чем этот участник платит, если резолюция принята.', team: 'opp' },
    ],
  },
];
const SECTIONS_AFTER_RU = [
  { key: 'gov', title: 'Правительство', q: 'Почему да?', team: 'gov' },
  { key: 'opp', title: 'Оппозиция', q: 'Почему нет?', team: 'opp' },
  {
    key: 'ext',
    title: 'Расширение',
    q: 'Что нового?',
    closing: true,
    prompt: 'Расширение: что нового скажешь ты?',
    hint: 'То, чего не скажет первый стол. Где искать: другой участник, другой мотив, долгий срок, уязвимая группа, принцип вместо практики.',
  },
  { key: 'clash', title: 'Столкновение', q: 'Где главный спор?', prompt: 'Где главное столкновение сторон?', hint: 'В чём стороны не согласны по сути. Обычно это и решает раунд.' },
];

// Вопрос и подсказка к аргументам стороны: свои, соперника или обе стороны без выбора.
const OWN_HINT = 'По одному аргументу. Развить каждый можно потом плюсом под блоком.';
const RIVAL_HINT = 'Аргументы соперника, по одному. Потом ответишь на каждый.';
const ARGUMENT_TEXT_RU = {
  gov: {
    '': ['Аргументы Правительства: почему да?', OWN_HINT],
    gov: ['Твои аргументы: почему да?', OWN_HINT],
    opp: ['Что скажет Правительство: почему да?', RIVAL_HINT],
  },
  opp: {
    '': ['Аргументы Оппозиции: почему нет?', OWN_HINT],
    gov: ['Что скажет Оппозиция: почему нет?', RIVAL_HINT],
    opp: ['Твои аргументы: почему нет?', OWN_HINT],
  },
};
// У закрывающей команды раздел своей стороны хранит то, что скажет первый стол.
const OPENING_TEXT_RU = ['Что скажет первый стол твоей стороны?', 'Аргументы, которые, скорее всего, возьмёт открывающая команда. Повторять их нельзя: твоё пойдёт в расширение.'];
const TEAM_NAME_RU = { gov: 'Правительство', opp: 'Оппозиция' };
const REPLY_PROMPT_TEXT = 60;

const detectType = (kind, text) => {
  if (kind === 'study') return 'topic';
  return kind === 'life' ? detectLife(text) : detectMotion(text);
};

const sectionDefs = type => (kindOf(type) === 'debate' ? [...SECTIONS_BEFORE, ...MOTION_TYPES[type].sections, ...SECTIONS_AFTER] : TYPES[type].sections);

const validSide = me => (me === 'gov' || me === 'opp' ? me : '');

// Своя сторона жёлтая, соперник синий. Пока сторона не выбрана, своей считается Правительство.
// У раздела без команды цвета нет: блок берёт его у родителя.
const sideFor = (team, me) => (team ? ((team === 'opp') !== (me === 'opp') ? 'o' : '') : undefined);

function detectMotion(text) {
  const e = text.toLowerCase().trim();
  if (/^(this house|th)\s*,?\s*(as|being)\s/.test(e)) return 'actor';
  if (/^(this house\s+(would\s+)?regrets?|thr)\b/.test(e)) return 'regret';
  if (/^(this house\s+(would\s+)?prefers?|thp)\b/.test(e)) return 'prefer';
  if (/^(this house\s+(supports|opposes|welcomes|celebrates)|ths|tho)\b/.test(e)) return 'support';
  if (/^(this house\s+(believes|thinks|values)|thbt)\b/.test(e)) return 'value';
  if (/^(this house|thw|th)\b/.test(e)) return 'policy';
  const t = text.toLowerCase().replace(/ё/g, 'е').trim().replace(/^эта палата/, 'эп');
  if (/^эп\s*,?\s*(будучи|как|в роли|являясь|на месте)\s/.test(t)) return 'actor';
  if (/^эп\s+(бы\s+)?сожалеет/.test(t)) return 'regret';
  if (/^эп\s+(скорее|предпоч)/.test(t)) return 'prefer';
  if (/^эп\s+(не\s+)?(поддерж|одобр|приветств|осужда|выступает|против)/.test(t)) return 'support';
  if (/^эп\s+(не\s+)?(считает|верит|полагает|убежден|думает|уверен)/.test(t)) return 'value';
  return 'policy';
}

function detectLife(text) {
  const t = text.toLowerCase().replace(/ё/g, 'е').trim();
  if (/\sor\s+(?!not\b)/.test(t)) return 'choice';
  if (/^(how|why|what to do)\b|\b(can't|cannot|can not|keep failing|struggle)\b/.test(t)) return 'problem';
  if (/^(which|where|who|what should i (choose|pick))\b/.test(t)) return 'choice';
  if (/\sили\s+(?!нет|не\s)/.test(t)) return 'choice';
  if (/^(как|почему|зачем|что делать|не)\s|\sне (получается|успеваю|могу|хватает)/.test(t)) return 'problem';
  if (/^(какой|какую|какое|какие|куда|кого|где|что выбрать)\s/.test(t)) return 'choice';
  return 'yesno';
}

// Резолюция начинается с «ЭП», жизненный вопрос кончается вопросительным знаком. Иначе по тексту не понять.
function detectKind(text) {
  const t = text.toLowerCase().trim();
  if (/^(эп|эта палата)(?![а-яё])/.test(t)) return 'debate';
  if (/^(this house|thw|thbt|thr|ths|thp|tho)\b|^th\s*,/.test(t)) return 'debate';
  return /\?$/.test(t) ? 'life' : '';
}

// place: позиция в БП (og, oo, cg, co) или просто сторона (gov, opp), как в файлах 2.3.
function buildSkeleton(doc, rootId, type, place) {
  const debate = kindOf(type) === 'debate';
  const pos = debate ? validPos(place) : '';
  const mine = debate ? teamOf(pos) || validSide(place) : '';
  const defs = sectionDefs(type);
  const sections = {};
  defs.forEach(s => {
    if (s.closing && !isClosing(pos)) return;
    const id = addBlock(doc, { parents: [rootId], text: s.title, q: s.q, side: sideFor(s.team, mine) });
    blockOf(doc, id).h = true;
    sections[s.key] = id;
  });
  doc.analysis = { type, root: rootId, sections, step: defs[0].key };
  if (mine) doc.analysis.me = mine;
  if (pos) doc.analysis.pos = pos;
  return doc.analysis;
}

const answersOf = (doc, id, q = '') => (blockOf(doc, id) ? childrenOf(doc, id).filter(c => sameQ(blockOf(doc, c).q, q)) : []);

// Свои аргументы, которые разбираются по звеньям FRIC. У закрывающей команды это расширение:
// то, что в разделе стороны, скажет первый стол.
function fricTargets(doc) {
  const a = doc.analysis;
  if (!a || kindOf(a.type) !== 'debate') return [];
  const me = a.me || '';
  const sides = isClosing(a.pos) ? [] : ['gov', 'opp'].filter(t => !me || t === me);
  return [...sides.flatMap(t => answersOf(doc, a.sections[t])), ...answersOf(doc, a.sections.ext)];
}

const ricOf = (doc, id) => ({
  r: answersOf(doc, id, WHY_Q).length > 0,
  i: answersOf(doc, id, IMPACT_Q).length > 0,
  c: answersOf(doc, id, WEIGH_Q).length > 0,
});

const fricSteps = (doc, id) => {
  const quote = `«${shorten(blockOf(doc, id).text, FRIC_TEXT)}»`;
  return FRIC_LINKS.map(l => {
    const step = { key: `${l.key}:${id}`, parent: id, q: l.q, prompt: `${quote}: ${l.ask}`, hint: l.hint };
    if (l.chips) step.chips = l.chips;
    return step;
  });
};

function burdenText(type, me) {
  const [gov, opp] = MOTION_TYPES[type].burden;
  if (me) return [tr('Бремя: что нужно доказать твоей стороне?'), me === 'gov' ? gov : opp];
  return [tr('Бремя: что нужно доказать каждой стороне?'), tr('Правительству: {gov} Оппозиции: {opp}', { gov, opp })];
}

const stepAnswers = (doc, step) => childrenOf(doc, step.parent).filter(id => sameQ(blockOf(doc, id).q, step.q));

const shorten = (text, max) => (text.length > max ? `${text.slice(0, max).trim()}…` : text);

// Шаги пересчитываются по схеме: у каждого участника и варианта свои шаги,
// на каждый аргумент другой стороны свой шаг ответа.
function analysisSteps(doc) {
  const a = doc.analysis;
  if (!a) return [];
  const me = a.me || '';
  const debate = kindOf(a.type) === 'debate';
  const closing = isClosing(a.pos);
  const targets = new Set(fricTargets(doc));
  const steps = [];
  const args = { gov: [], opp: [] };
  sectionDefs(a.type).forEach(s => {
    const parent = a.sections[s.key];
    if (!blockOf(doc, parent)) return;
    const side = s.key === 'ext' ? '' : sideFor(s.team, me);
    if (debate && s.key === 'opp') {
      const prompt = me === 'opp' ? tr('Твоя линия: что защищает Оппозиция?') : tr('Линия Оппозиции: что она защищает?');
      steps.push({ key: 'stance', parent, q: tr(STANCE_Q), prompt, hint: MOTION_TYPES[a.type].line, side });
    }
    let text = [s.prompt || s.q, s.hint];
    if (debate && s.team) text = closing && s.team === me ? OPENING_TEXT : ARGUMENT_TEXT[s.team][me];
    if (s.key === 'burden') text = burdenText(a.type, me);
    const step = { key: s.key, parent, q: '', prompt: text[0], hint: text[1], side };
    steps.push(step);
    (s.asks || []).forEach(x => steps.push({ key: `${s.key}:${x.key}`, parent, q: x.q, prompt: x.prompt, hint: x.hint, side }));
    if (debate && s.team) args[s.team] = stepAnswers(doc, step);
    stepAnswers(doc, step).filter(id => targets.has(id)).forEach(id => steps.push(...fricSteps(doc, id)));
    if (!s.each) return;
    childrenOf(doc, parent).forEach(item => {
      const name = blockOf(doc, item).text;
      s.each.forEach(e => steps.push({ key: `${e.key}:${item}`, parent: item, q: e.q, prompt: `${name}: ${e.ask}`, hint: e.hint, side: sideFor(e.team, me) }));
    });
  });
  if (!debate) return steps;
  const replies = [];
  const answer = (team, rival) => args[rival].forEach(id => {
    const quote = `«${shorten(blockOf(doc, id).text, REPLY_PROMPT_TEXT)}»`;
    replies.push({
      key: `reply:${id}`,
      parent: id,
      q: tr(REPLY_Q),
      prompt: me ? tr('Ответ на {quote}', { quote }) : tr('{team} отвечает на {quote}', { team: TEAM_NAME[team], quote }),
      hint: me
        ? tr('Почему это неверно, не так важно или даже помогает тебе. Можно несколько ответов.')
        : tr('Почему это неверно, не так важно или даже помогает другой стороне. Можно несколько ответов.'),
      side: sideFor(team, me),
    });
  });
  if (me !== 'gov') answer('opp', 'gov');
  if (me !== 'opp') answer('gov', 'opp');
  const clash = steps.findIndex(s => s.key === 'clash');
  steps.splice(clash < 0 ? steps.length : clash, 0, ...replies);
  return steps;
}

// Смена стороны меняет местами жёлтое и синее во всём, что принадлежит сторонам:
// в их аргументах с ответами и в выгодах и потерях участников.
function setMySide(doc, me) {
  const a = doc.analysis;
  if (!a || kindOf(a.type) !== 'debate') return false;
  const next = validSide(me);
  const flip = (a.me === 'opp') !== (next === 'opp');
  if (next) a.me = next;
  else delete a.me;
  if (a.pos && teamOf(a.pos) !== next) delete a.pos;
  if (!flip) return false;
  const roots = [a.sections.gov, a.sections.opp].filter(id => blockOf(doc, id));
  if (blockOf(doc, a.sections.actors)) {
    childrenOf(doc, a.sections.actors).forEach(actor => roots.push(...childrenOf(doc, actor)));
  }
  const teams = walk(doc, roots, childrenOf);
  doc.nodes.forEach(n => {
    if (!teams.has(n.id)) return;
    if (n.side === 'o') delete n.side;
    else n.side = 'o';
  });
  return true;
}

function parseAnalysis(raw, doc) {
  if (!raw || typeof raw !== 'object' || !own(TYPES, raw.type) || !blockOf(doc, raw.root)) return null;
  const sections = {};
  sectionDefs(raw.type).forEach(s => {
    const id = raw.sections && own(raw.sections, s.key);
    if (typeof id === 'string' && blockOf(doc, id)) sections[s.key] = id;
  });
  const analysis = { type: raw.type, root: raw.root, sections, step: String(raw.step || '') };
  if (kindOf(raw.type) === 'debate' && validSide(raw.me)) analysis.me = raw.me;
  if (analysis.me && teamOf(raw.pos) === analysis.me) analysis.pos = raw.pos;
  if (Number.isFinite(raw.t0)) analysis.t0 = raw.t0;
  return analysis;
}

// Позиция в БП. Расширение появляется у закрывающей команды и остаётся своим при любой смене.
function setPosition(doc, pos) {
  const a = doc.analysis;
  if (!a || kindOf(a.type) !== 'debate') return false;
  const next = validPos(pos);
  setMySide(doc, teamOf(next));
  if (next) a.pos = next;
  else delete a.pos;
  if (isClosing(next) && !blockOf(doc, a.sections.ext)) {
    const def = SECTIONS_AFTER.find(s => s.key === 'ext');
    const id = addBlock(doc, { parents: [a.root], text: def.title, q: def.q, after: a.sections.opp });
    blockOf(doc, id).h = true;
    a.sections.ext = id;
  }
  return true;
}

// ---------- Таймер подготовки ----------

const MINUTE = 60000;
const PREP_MS = 15 * MINUTE;
const PREP_HIDE_MS = 30 * MINUTE;
const PREP_STAGES_RU = [['определениям, бремени и фрейму', 3], ['участникам', 3], ['аргументам', 7], ['ответам и столкновению', 2]];

function prepStage(key) {
  const head = key.split(':')[0];
  if (['defs', 'burden', 'frame'].includes(head)) return 0;
  if (['gov', 'opp', 'stance', 'ext', ...FRIC_LINKS.map(l => l.key)].includes(head)) return 2;
  if (head === 'reply' || head === 'clash') return 3;
  return 1;
}

// Сколько осталось из 15 минут и не застрял ли текущий шаг на этапе, время которого уже прошло.
function prepStatus(key, elapsed) {
  if (!(elapsed >= 0) || elapsed > PREP_HIDE_MS) return null;
  let end = 0;
  let due = PREP_STAGES.length - 1;
  for (let i = 0; i < PREP_STAGES.length; i++) {
    end += PREP_STAGES[i][1] * MINUTE;
    if (elapsed < end) {
      due = i;
      break;
    }
  }
  return {
    left: Math.max(0, Math.ceil((PREP_MS - elapsed) / 1000)),
    over: elapsed >= PREP_MS,
    late: prepStage(key) < due,
    label: tr('пора к {stage}', { stage: PREP_STAGES[due][0] }),
  };
}

// ---------- План речи ----------

const planPathFor = path => `${path.replace(/\.[^./]+$/, '')} — ${tr('план речи')}.md`;

function speechPlan(doc, title) {
  const a = doc.analysis;
  const s = a.sections;
  const text = id => blockOf(doc, id).text;
  const texts = ids => ids.map(text);
  const pos = posInfo(a.pos);
  // Название заметки Obsidian и так показывает сверху, поэтому своего заголовка нет.
  const lines = ['---', 'cssclasses: lt-speech', '---', tr('**Резолюция:** {text}', { text: text(a.root) }), ''];
  lines.push(tr('**Позиция:** {pos}', { pos: pos ? `${pos[1]}, ${pos[2]}` : a.me ? TEAM_NAME[a.me] : tr('ещё не выбрана') }), '');
  const burden = texts(answersOf(doc, s.burden));
  if (burden.length) lines.push(tr('**Что доказываем:** {text}', { text: burden.join('; ') }), '');
  lines.push(tr('> Собрано из дерева «{title}». Меняй дерево: правки здесь пропадут при следующей сборке.', { title }), '');
  const teams = a.me ? [a.me] : ['gov', 'opp'];
  teams.forEach(team => {
    if (teams.length > 1) lines.push(team === 'opp' ? tr('# За Оппозицию (первый стол)') : tr('# За Правительство (первый стол)'), '');
    lines.push(...teamPlan(doc, team, isClosing(a.pos)));
  });
  return lines.join('\n');
}

function argumentLines(doc, id, n) {
  const list = q => answersOf(doc, id, q).map(c => blockOf(doc, c).text);
  const row = (label, items, optional) => {
    if (items.length) return [`- **${label}:** ${items.join('; ')}`];
    return optional ? [] : [`- **${label}:** ${tr('_не заполнено_')}`];
  };
  return [
    `### ${n}. ${blockOf(doc, id).text}`,
    ...row(tr('Почему правда'), list(WHY_Q)),
    ...row(tr('Пример'), list(EXAMPLE_Q), true),
    ...row(tr('К чему ведёт'), list(IMPACT_Q)),
    ...row(tr('Почему важнее'), list(WEIGH_Q)),
    '',
  ];
}

function teamPlan(doc, team, closing) {
  const s = doc.analysis.sections;
  const rival = team === 'gov' ? 'opp' : 'gov';
  const text = id => blockOf(doc, id).text;
  const texts = ids => ids.map(text);
  const lines = [];
  const list = (label, items) => {
    if (items.length) lines.push(`**${label}**`, ...items.map(t => `- ${t}`), '');
  };
  const args = (ids, from) => ids.forEach((id, i) => lines.push(...argumentLines(doc, id, from + i + 1)));
  const sideArgs = answersOf(doc, s[team]);
  const replies = answersOf(doc, s[rival])
    .filter(id => answersOf(doc, id, REPLY_Q).length)
    .map(id => tr('На «{arg}»: {text}', { arg: text(id), text: texts(answersOf(doc, id, REPLY_Q)).join('; ') }));
  const clash = texts(answersOf(doc, s.clash));
  const frame = [...texts(answersOf(doc, s.frame)), ...texts(answersOf(doc, s.frame, WHO_Q)).map(t => tr('Сильнее всего задевает: {who}', { who: t }))];

  if (closing) {
    const ext = answersOf(doc, s.ext);
    lines.push(tr('## Первый спикер'), '');
    list(tr('Ответ соперникам'), replies);
    list(tr('Первый стол уже скажет, не повторять'), texts(sideArgs));
    lines.push(tr('**Расширение**'), '');
    if (ext.length) args(ext, 0);
    else lines.push(tr('_Расширения пока нет: добавь его в разборе._'), '');
    lines.push(tr('## Второй спикер'), '');
    list(tr('Главные споры'), clash);
    list(tr('Сравнение'), [...ext, ...sideArgs].flatMap(id => texts(answersOf(doc, id, WEIGH_Q)).map(w => `${text(id)}: ${w}`)));
    lines.push(tr('_Без новых аргументов. Покажи, почему ваша команда лучше трёх остальных._'), '');
    return lines;
  }

  const first = sideArgs.slice(0, 2);
  const rest = sideArgs.slice(2);
  lines.push(tr('## Первый спикер'), '');
  if (team === 'gov') {
    list(tr('Определения'), texts(answersOf(doc, s.defs)));
    list(tr('Фрейм'), frame);
    list(tr('Механизм'), texts(answersOf(doc, s.mechanism)));
  } else {
    list(tr('Наша линия'), texts(answersOf(doc, s.opp, STANCE_Q)));
    list(tr('Фрейм'), frame);
    list(tr('Ответ Правительству'), replies);
  }
  if (first.length) lines.push(tr('**Аргументы:** {list}', { list: texts(first).map((t, i) => `${i + 1}) ${t}`).join('; ') }), '');
  args(first, 0);
  lines.push(tr('## Второй спикер'), '');
  if (team === 'gov') list(tr('Ответ Оппозиции'), replies);
  else list(tr('Ответ на новое от Правительства'), [tr('запиши во время раунда')]);
  if (rest.length) args(rest, 2);
  else lines.push(tr('_Новых аргументов нет: углуби первые через ещё одно «почему правда?» или импакт._'), '');
  list(tr('Главный спор'), clash);
  return lines;
}

// ---------- Тренажёр ----------

// Резолюции для тренировки: разные типы и темы, понятные без подготовки.
const TRAIN_MOTIONS_RU = [
  'ЭП запретила бы автомобили в центре крупных городов',
  'ЭП ввела бы обязательное голосование на выборах',
  'ЭП запретила бы смартфоны в школах',
  'ЭП ввела бы налог на сладкие напитки',
  'ЭП сделала бы высшее образование бесплатным',
  'ЭП ввела бы безусловный базовый доход',
  'ЭП запретила бы рекламу, нацеленную на детей',
  'ЭП ввела бы четырёхдневную рабочую неделю',
  'ЭП разрешила бы голосовать с 16 лет',
  'ЭП запретила бы продажу энергетиков несовершеннолетним',
  'ЭП обязала бы соцсети проверять возраст пользователей',
  'ЭП ввела бы квоты для женщин в парламенте',
  'ЭП отменила бы домашние задания в начальной школе',
  'ЭП платила бы школьникам за хорошие оценки',
  'ЭП ввела бы обязательную военную или гражданскую службу для молодёжи',
  'ЭП сожалеет о росте популярности коротких видео',
  'ЭП сожалеет о культуре работы без выходных',
  'ЭП сожалеет о том, что успех измеряют деньгами',
  'ЭП сожалеет о популярности фитнес-блогеров',
  'ЭП сожалеет о переходе школ на электронные дневники',
  'ЭП сожалеет о романтизации переработок у врачей',
  'ЭП поддерживает переезд молодёжи из сёл в столицу',
  'ЭП поддерживает рост удалённой работы',
  'ЭП поддерживает использование ИИ в школах',
  'ЭП поддерживает движение за отказ от мяса',
  'ЭП поддерживает культуру открытых зарплат',
  'ЭП предпочла бы мир, в котором у людей нет соцсетей',
  'ЭП предпочла бы мир, в котором все знают дату своей смерти',
  'ЭП предпочла бы мир, в котором профессию выбирают по тесту способностей',
  'ЭП предпочла бы мир, где дети учатся дома, а не в школе',
  'ЭП предпочла бы мир без наследства',
  'ЭП, будучи родителем, не разрешила бы ребёнку вести блог',
  'ЭП, будучи студентом-медиком, выбрала бы работу в селе, а не в столице',
  'ЭП, будучи выпускником, взяла бы год паузы перед университетом',
  'ЭП, будучи врачом, всегда говорила бы пациенту полный диагноз',
  'ЭП разрешила бы продажу органов под контролем государства',
  'ЭП ввела бы платный въезд в центр города',
  'ЭП запретила бы частные школы',
  'ЭП сделала бы донорство органов после смерти обязательным по умолчанию',
  'ЭП запретила бы политическую рекламу в интернете',
];
const TRAIN_MOTIONS_EN = [
  'This House would ban cars from city centres',
  'This House would make voting compulsory',
  'This House would ban smartphones in schools',
  'This House would tax sugary drinks',
  'This House would make university education free',
  'This House would introduce a universal basic income',
  'This House would ban advertising aimed at children',
  'This House would adopt a four-day working week',
  'This House would lower the voting age to 16',
  'This House would ban the sale of energy drinks to minors',
  'This House would require social media platforms to verify users\' ages',
  'This House would abolish homework in primary schools',
  'This House would pay students for good grades',
  'This House would introduce mandatory national service for young people',
  'This House regrets the rise of short-form video',
  'This House regrets hustle culture',
  'This House regrets measuring success by wealth',
  'This House regrets the popularity of fitness influencers',
  'This House regrets the glorification of overwork in medicine',
  'This House supports the rise of remote work',
  'This House supports the use of AI in schools',
  'This House supports pay transparency',
  'This House supports young people moving from rural areas to big cities',
  'This House prefers a world without social media',
  'This House prefers a world where everyone knows the date of their death',
  'This House prefers a world without inheritance',
  'This House, as a parent, would not let their child become an influencer',
  'This House, as a medical graduate, would choose to work in a rural area',
  'This House, as a school leaver, would take a gap year before university',
  'This House believes that doctors should always tell patients their full diagnosis',
  'This House would make organ donation opt-out',
  'This House would ban political advertising online',
];

const SPEECH_MS = 7 * MINUTE;
// Вкладки подготовки и минута, к которой этап должен закончиться, как на бумажном шаблоне.
const TRAIN_TABS_RU = [
  { key: 'think', title: 'О чём спор', span: '0–3', end: 3, next: 'Пора выписывать идеи' },
  { key: 'ideas', title: 'Все идеи', span: '3–9', end: 9, next: 'Пора писать лист речи' },
  { key: 'sheet', title: 'Лист речи', span: '9–15', end: 15, next: '' },
];
const TRAIN_FIELDS_RU = {
  think: [
    ['words', 'Слова: что значат', 'Ключевые слова резолюции и что ты под ними понимаешь'],
    ['prove', 'Что нам надо доказать', 'Одной фразой'],
    ['win', 'Кто выигрывает', 'Кого это касается и что они получат'],
    ['lose', 'Кто теряет', 'Кого задевает сильнее всего'],
  ],
  ideas: [
    ['ours', 'За нашу сторону', 'Одна идея — одна строка, 2–4 слова. Без отбора: лучшие станут аргументами.'],
    ['theirs', 'Что скажут против → чем ответим', 'Одна строка — один их довод и твой ответ'],
  ],
};
const ARG_FIELDS_RU = [
  ['thesis', 'Тезис', 'Одна фраза целиком'],
  ['why', 'Почему правда', 'Шаг → шаг → вывод'],
  ['example', 'Пример', '2–3 слова'],
  ['impact', 'К чему ведёт', 'Для кого и что изменится'],
  ['weigh', 'Почему важнее', 'Чем это весомее, чем у соперника'],
];
const REQUIRED_ARG = ['thesis', 'why', 'impact', 'weigh'];

const clock = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
const LIST_MARK = /^\s*(?:[-*+]|\d+[.)])\s+/;

// Резолюции из своей заметки: по одной в строке, маркеры списка и заголовки не считаются.
function motionBank(text) {
  let lines = String(text || '').split('\n');
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) lines = lines.slice(end + 1);
  }
  return lines
    .filter(l => !/^\s*#/.test(l))
    .map(l => l.replace(LIST_MARK, '').trim())
    .filter(l => l.length >= 12);
}

function pickMotion(list, recent, rand = Math.random) {
  if (!list.length) return '';
  const fresh = list.filter(m => !recent.includes(m));
  const from = fresh.length ? fresh : list;
  return from[Math.min(from.length - 1, Math.floor(rand() * from.length))];
}

// Сколько осталось из 15 минут и не отстаёт ли открытая вкладка от времени.
function trainPace(tab, elapsed) {
  if (!(elapsed >= 0)) return null;
  const over = elapsed >= PREP_MS;
  const due = over ? TRAIN_TABS.length - 1 : TRAIN_TABS.findIndex(t => elapsed < t.end * MINUTE);
  const late = !over && tab < due;
  let text = '';
  if (over) text = tr('Время подготовки вышло: переходи к речи.');
  else if (late) text = tr('{next}: прошло {min} мин.', { next: TRAIN_TABS[due - 1].next, min: TRAIN_TABS[due - 1].end });
  return { left: Math.max(0, Math.ceil((PREP_MS - elapsed) / 1000)), over, late, due, text };
}

function sheetParts(pos) {
  const closing = isClosing(pos);
  return [
    { key: 'intro', title: tr('Вступление'), at: 0, hint: tr('Одна фраза целиком: о чём твоя речь') },
    pos === 'og'
      ? { key: 'answer', title: tr('Определения'), at: 30, hint: tr('Что значат слова резолюции и что именно вы предлагаете') }
      : { key: 'answer', title: tr('Ответ соперникам'), at: 30, hint: tr('2–3 главных: что они сказали → чем ответишь. Можно дописать во время раунда.') },
    { key: 'a1', title: tr('Аргумент 1'), at: 90, arg: true, hint: closing ? tr('Расширение: то, чего точно не скажет первый стол') : tr('Самый сильный') },
    { key: 'a2', title: tr('Аргумент 2'), at: 240, arg: true, hint: closing ? tr('Ещё одна сторона расширения или его углубление') : tr('Второй по силе') },
    { key: 'end', title: tr('Вывод'), at: 390, hint: tr('Одна фраза целиком: почему вы выиграли') },
  ];
}

// Какую часть листа речи пора говорить: по отметкам времени, как на бумаге.
function speakPart(elapsed) {
  let i = 0;
  sheetParts('').forEach((p, n) => { if (elapsed >= p.at * 1000) i = n; });
  return i;
}

function ideaLines(text) {
  const seen = new Set();
  return String(text || '').split('\n')
    .map(l => l.replace(LIST_MARK, '').trim())
    .filter(l => l && !seen.has(l) && seen.add(l));
}

function missingFields(t) {
  const f = t.f || {};
  const empty = k => !String(f[k] || '').trim();
  const out = [];
  sheetParts(t.pos).forEach(p => {
    if (p.arg) {
      REQUIRED_ARG.forEach(k => {
        if (empty(`${p.key}.${k}`)) out.push(`${p.title}: ${ARG_FIELDS.find(a => a[0] === k)[1].toLowerCase()}`);
      });
    } else if (p.key !== 'answer' && empty(p.key)) out.push(p.title);
  });
  return out;
}

const spentText = (from, to, limit) => tr('{spent} из {limit}', { spent: clock(Math.round((to - from) / 1000)), limit: clock(limit / 1000) });

function trainingNote(t) {
  const f = t.f || {};
  const val = k => String(f[k] || '').trim();
  const bullets = k => ideaLines(val(k)).map(l => `- ${l}`);
  const pos = posInfo(t.pos);
  const lines = ['---', 'cssclasses: lt-speech', '---', tr('**Резолюция:** {motion}', { motion: t.motion }), ''];
  if (pos) lines.push(tr('**Позиция:** {short}, {name}', { short: pos[1], name: pos[2] }), '');
  const time = [t.p1 ? tr('подготовка {time}', { time: spentText(t.t0, t.p1, PREP_MS) }) : tr('подготовка идёт')];
  if (t.s0 && t.s1) time.push(tr('речь {time}', { time: spentText(t.s0, t.s1, SPEECH_MS) }));
  lines.push(tr('**Время:** {list}', { list: time.join(', ') }), '', tr('## Лист речи'), '');
  sheetParts(t.pos).forEach(p => {
    const mark = clock(p.at);
    if (p.arg) {
      lines.push(`### ${mark} ${p.title}: ${val(`${p.key}.thesis`) || tr('_не заполнено_')}`);
      ARG_FIELDS.slice(1).forEach(([k, label]) => {
        const v = ideaLines(val(`${p.key}.${k}`)).join('; ');
        if (v) lines.push(`- **${label}:** ${v}`);
        else if (REQUIRED_ARG.includes(k)) lines.push(`- **${label}:** ${tr('_не заполнено_')}`);
      });
      lines.push('');
    } else if (p.key === 'answer') {
      const items = bullets('answer');
      if (items.length) lines.push(`**${mark} ${p.title}**`, ...items, '');
    } else {
      lines.push(`**${mark} ${p.title}.** ${val(p.key) || tr('_не заполнено_')}`, '');
    }
  });
  const prep = [];
  [...TRAIN_FIELDS.think, ...TRAIN_FIELDS.ideas].forEach(([k, label]) => {
    const items = bullets(k);
    if (items.length) prep.push(`**${label}**`, ...items, '');
  });
  if (prep.length) lines.push(tr('## Подготовка'), '', ...prep);
  return lines.join('\n');
}

// Тренировка из data.json: всё, что не похоже на своё поле, отбрасывается.
function parseTraining(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const motion = typeof raw.motion === 'string' ? raw.motion.trim() : '';
  if (!motion || !Number.isFinite(raw.t0)) return null;
  const time = v => (Number.isFinite(v) ? v : null);
  const f = {};
  if (raw.f && typeof raw.f === 'object') {
    Object.keys(raw.f).forEach(k => { if (typeof raw.f[k] === 'string') f[k] = raw.f[k]; });
  }
  return {
    motion,
    pos: validPos(raw.pos),
    t0: raw.t0,
    p1: time(raw.p1),
    s0: time(raw.s0),
    s1: time(raw.s1),
    f,
    path: typeof raw.path === 'string' && raw.path ? raw.path : null,
  };
}

function trainingPath(date, exists) {
  const two = n => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}-${two(date.getMinutes())}`;
  const name = tr('Тренировка {stamp}', { stamp });
  let path = `${TRAIN_FOLDER}/${name}.md`;
  for (let n = 2; exists(path); n++) path = `${TRAIN_FOLDER}/${name} (${n}).md`;
  return path;
}

function parseDoc(text) {
  if (!text.trim()) return emptyDoc();
  const raw = JSON.parse(text);
  if (!raw || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) throw new Error('not a tree');
  const doc = emptyDoc();
  const ids = new Set();
  raw.nodes.forEach(n => {
    if (!n || typeof n.id !== 'string' || ids.has(n.id)) return;
    ids.add(n.id);
    const block = { id: n.id, text: String(n.text || ''), q: String(n.q || '') };
    if (n.side === 'o') block.side = 'o';
    if (n.collapsed === true) block.collapsed = true;
    if (n.h === true) block.h = true;
    doc.nodes.push(block);
  });
  raw.edges.forEach(e => {
    if (!Array.isArray(e) || !ids.has(e[0]) || !ids.has(e[1]) || e[0] === e[1]) return;
    if (!hasEdge(doc, e[0], e[1]) && !reaches(doc, e[1], e[0])) doc.edges.push([e[0], e[1]]);
  });
  const used = doc.nodes.map(n => Number(n.id.slice(1)) || 0);
  doc.nextId = Math.max(Number(raw.nextId) || 1, ...used.map(n => n + 1), 1);
  const analysis = parseAnalysis(raw.analysis, doc);
  if (analysis) doc.analysis = analysis;
  return doc;
}

// Раскладка: слои сверху вниз, длинные стрелки идут через невидимые узлы,
// линии только под прямым углом, сходящиеся ветки делят одну общую шину.
function layout(nodes, edges, heights, widths = {}) {
  if (!nodes.length) return { pos: {}, paths: [], arrows: [], labels: [], width: 0, height: 0 };

  const parents = new Map(nodes.map(n => [n.id, []]));
  const children = new Map(nodes.map(n => [n.id, []]));
  edges.forEach(([a, b]) => { children.get(a).push(b); parents.get(b).push(a); });

  const rank = new Map(nodes.map(n => [n.id, 0]));
  const waiting = new Map(nodes.map(n => [n.id, parents.get(n.id).length]));
  const queue = nodes.filter(n => !waiting.get(n.id)).map(n => n.id);
  for (let i = 0; i < queue.length; i++) {
    for (const c of children.get(queue[i])) {
      rank.set(c, Math.max(rank.get(c), rank.get(queue[i]) + 1));
      waiting.set(c, waiting.get(c) - 1);
      if (!waiting.get(c)) queue.push(c);
    }
  }

  const V = new Map();
  nodes.forEach(n => V.set(n.id, {
    id: n.id, node: n, rank: rank.get(n.id), w: widths[n.id] || NODE_W, h: heights[n.id] || 40, dummy: false, up: [], down: [], x: 0, edges: new Map(),
  }));
  const link = (a, b, edge) => {
    a.down.push(b);
    b.up.push(a);
    a.edges.set(b, edge);
  };
  edges.forEach(([from, to], i) => {
    const edge = { from, to };
    let prev = V.get(from);
    const end = V.get(to);
    for (let r = prev.rank + 1; r < end.rank; r++) {
      const d = { id: `d${i}_${r}`, rank: r, w: DUMMY_W, h: 0, dummy: true, up: [], down: [], x: 0, edges: new Map() };
      V.set(d.id, d);
      link(prev, d, edge);
      prev = d;
    }
    link(prev, end, edge);
  });

  const depth = Math.max(...[...V.values()].map(v => v.rank)) + 1;
  let layers = Array.from({ length: depth }, () => []);
  const seen = new Set();
  const visit = v => {
    if (seen.has(v)) return;
    seen.add(v);
    layers[v.rank].push(v);
    v.down.forEach(visit);
  };
  nodes.forEach(n => { if (!parents.get(n.id).length) visit(V.get(n.id)); });

  const crossings = ls => {
    let total = 0;
    for (let r = 0; r < ls.length - 1; r++) {
      const pos = new Map(ls[r + 1].map((v, i) => [v, i]));
      const segs = [];
      ls[r].forEach((v, i) => v.down.forEach(d => segs.push([i, pos.get(d)])));
      for (let a = 0; a < segs.length; a++) {
        for (let b = a + 1; b < segs.length; b++) {
          if ((segs[a][0] - segs[b][0]) * (segs[a][1] - segs[b][1]) < 0) total++;
        }
      }
    }
    return total;
  };
  let best = layers.map(l => l.slice());
  let bestCount = crossings(layers);
  for (let it = 0; it < 8 && bestCount; it++) {
    const down = it % 2 === 0;
    for (let i = 0; i < depth; i++) {
      const r = down ? i : depth - 1 - i;
      const other = layers[down ? r - 1 : r + 1];
      if (!other) continue;
      const pos = new Map(other.map((v, j) => [v, j]));
      const score = new Map(layers[r].map((v, j) => {
        const near = down ? v.up : v.down;
        return [v, near.length ? near.reduce((s, n) => s + pos.get(n), 0) / near.length : j];
      }));
      layers[r] = layers[r].slice().sort((a, b) => score.get(a) - score.get(b));
    }
    const count = crossings(layers);
    if (count < bestCount) { best = layers.map(l => l.slice()); bestCount = count; }
  }
  layers = best;

  const sep = (a, b) => (a.w + b.w) / 2 + GAP_X + (a.up.some(p => b.up.includes(p)) ? 0 : 12);
  layers.forEach(l => {
    let x = 0;
    l.forEach((v, i) => { if (i) x += sep(l[i - 1], v); v.x = x; });
  });
  const settle = (layer, want) => {
    const left = want.slice();
    const right = want.slice();
    for (let i = 1; i < layer.length; i++) left[i] = Math.max(left[i], left[i - 1] + sep(layer[i - 1], layer[i]));
    for (let i = layer.length - 2; i >= 0; i--) right[i] = Math.min(right[i], right[i + 1] - sep(layer[i], layer[i + 1]));
    layer.forEach((v, i) => { v.x = (left[i] + right[i]) / 2; });
  };
  const mean = list => list.reduce((s, v) => s + v.x, 0) / list.length;
  const sweepUp = () => {
    for (let r = depth - 2; r >= 0; r--) settle(layers[r], layers[r].map(v => (v.down.length ? mean(v.down) : v.x)));
  };
  const sweepDown = () => {
    for (let r = 1; r < depth; r++) settle(layers[r], layers[r].map(v => (v.up.length ? mean(v.up) : v.x)));
  };
  for (let it = 0; it < 12; it++) { sweepUp(); sweepDown(); }
  sweepUp();

  const all = [...V.values()];
  const minX = Math.min(...all.map(v => v.x - v.w / 2));
  all.forEach(v => { v.x = Math.round(v.x - minX + MARGIN); });

  const layerH = layers.map(l => Math.max(0, ...l.map(v => v.h)));
  const y = [MARGIN];
  const paths = [];
  const arrows = [];
  const labels = [];

  for (let r = 0; r < depth - 1; r++) {
    // Связные группы стрелок в промежутке: у каждой своя шина.
    const groups = [];
    const used = new Set();
    for (const start of layers[r]) {
      if (used.has(start) || !start.down.length) continue;
      const g = { tops: [], bottoms: [] };
      const stack = [start];
      used.add(start);
      while (stack.length) {
        const v = stack.pop();
        const top = v.rank === r;
        (top ? g.tops : g.bottoms).push(v);
        for (const n of top ? v.down : v.up) if (!used.has(n)) { used.add(n); stack.push(n); }
      }
      const xs = [...g.tops, ...g.bottoms].map(v => v.x);
      g.min = Math.min(...xs);
      g.max = Math.max(...xs);
      g.straight = g.max - g.min < 1.5;
      g.real = g.bottoms.filter(v => !v.dummy);
      const qs = [...new Set(g.real.map(v => v.node.q))];
      if (qs.length === 1 && qs[0]) {
        g.text = qs[0];
        g.place = g.straight ? 'mid' : g.tops.length === 1 ? 'top' : g.bottoms.length === 1 ? 'bottom' : 'bus';
      } else if (qs.some(Boolean)) {
        g.place = 'child';
      }
      groups.push(g);
    }

    const ends = [];
    groups.slice().sort((a, b) => a.min - b.min).forEach(g => {
      if (g.straight) { g.channel = 0; return; }
      let c = ends.findIndex(e => e + 10 < g.min);
      if (c < 0) { c = ends.length; ends.push(0); }
      ends[c] = g.max;
      g.channel = c;
    });
    const topH = groups.some(g => g.place === 'top' || g.place === 'mid') ? STUB_TOP_LABEL : STUB_TOP;
    const botH = groups.some(g => g.place === 'bottom' || g.place === 'child') ? STUB_BOTTOM_LABEL : STUB_BOTTOM;
    const gapH = topH + Math.max(ends.length - 1, 0) * CHANNEL + botH;
    const layerBottom = y[r] + layerH[r];
    y[r + 1] = layerBottom + gapH;

    for (const g of groups) {
      const bus = layerBottom + topH + g.channel * CHANNEL;
      for (const t of g.tops) {
        for (const b of t.down) {
          const startY = t.dummy ? y[r] : y[r] + t.h;
          const endY = y[r + 1] - (b.dummy ? 0 : 8);
          const pts = g.straight
            ? [[g.tops[0].x, startY], [g.tops[0].x, endY]]
            : [[t.x, startY], [t.x, bus], [b.x, bus], [b.x, endY]];
          paths.push({ pts, from: t.edges.get(b).from, to: t.edges.get(b).to });
        }
      }
      g.real.forEach(b => arrows.push({ x: g.straight ? g.tops[0].x : b.x, y: y[r + 1], to: b.id }));
      const ids = g.real.map(v => v.id);
      const { place } = g;
      if (place === 'mid') labels.push({ x: g.tops[0].x, y: layerBottom + gapH / 2 - 4, text: g.text, ids, place });
      if (place === 'top') labels.push({ x: g.tops[0].x, y: layerBottom + topH / 2, text: g.text, ids, place });
      if (place === 'bottom') labels.push({ x: g.bottoms[0].x, y: y[r + 1] - botH / 2 - 3, text: g.text, ids, place });
      if (place === 'bus') labels.push({ x: (g.min + g.max) / 2, y: bus, text: g.text, ids, place });
      if (place === 'child') {
        g.real.filter(v => v.node.q).forEach(v => labels.push({ x: v.x, y: y[r + 1] - botH / 2 - 3, text: v.node.q, ids: [v.id], place }));
      }
    }
  }

  const pos = {};
  nodes.forEach(n => {
    const v = V.get(n.id);
    pos[n.id] = { x: v.x - v.w / 2, y: y[v.rank], h: v.h, w: v.w };
  });
  return {
    pos,
    paths,
    arrows,
    labels,
    width: Math.max(...all.map(v => v.x + v.w / 2)) + MARGIN,
    height: y[depth - 1] + layerH[depth - 1] + MARGIN,
  };
}

// ---------- Текст в блоке ----------

// Длинная резолюция в обычном блоке превращается в высокий столб, поэтому верхний блок с длинным текстом шире.
const blockWidth = (text, isRoot) => (isRoot && text.length > WIDE_TEXT ? NODE_W * 2 : NODE_W);

// Самый крупный шрифт, при котором ни одно слово не рвётся посреди. Крупный только у коротких текстов.
function pickSize(text, width, measure) {
  const words = text.split(/\s+/).filter(Boolean);
  const sizes = text.length <= SHORT_TEXT ? FONT_SIZES : FONT_SIZES.slice(1);
  return sizes.find(size => words.every(w => measure(w, size) <= width)) || FONT_SIZES[FONT_SIZES.length - 1];
}

// ---------- Экспорт в PDF ----------

// Перенос строк для рисования на холсте: по словам, а слишком длинное слово по буквам.
function wrapText(text, maxWidth, measure) {
  const lines = [];
  let line = '';
  text.split(/\s+/).filter(Boolean).forEach(word => {
    const joined = line ? `${line} ${word}` : word;
    if (measure(joined) <= maxWidth) {
      line = joined;
      return;
    }
    if (line) lines.push(line);
    let rest = word;
    while (rest.length > 1 && measure(rest) > maxWidth) {
      let n = rest.length - 1;
      while (n > 1 && measure(rest.slice(0, n)) > maxWidth) n--;
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
    line = rest;
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// Чёткость до трёх точек на пиксель, но картинка должна уместиться в память телефона.
const exportScale = (w, h, maxPixels) => Math.min(3, Math.sqrt(maxPixels / (w * h)), 8000 / Math.max(w, h));

const pdfPathFor = path => `${path.replace(/\.[^./]+$/, '')}.pdf`;

// Одна страница по размеру схемы, на ней одна картинка JPEG.
function buildPdf({ jpeg, imgW, imgH, pageW, pageH, title }) {
  const num = n => String(Math.round(n * 100) / 100);
  const bytes = s => Uint8Array.from(s, c => c.charCodeAt(0));
  const utf16 = s => `FEFF${Array.from(s, c => c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join('')}`;
  const content = `q ${num(pageW)} 0 0 ${num(pageH)} 0 0 cm /Im0 Do Q`;
  const objects = [
    ['<< /Type /Catalog /Pages 2 0 R >>'],
    ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>'],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(pageW)} ${num(pageH)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`],
    [`<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, '\nendstream'],
    [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`],
    [`<< /Title <${utf16(title)}> /Producer (Logic Tree) >>`],
  ];
  const parts = [bytes('%PDF-1.4\n%\xff\xff\xff\xff\n')];
  const offsets = [];
  let size = parts[0].length;
  const push = chunk => {
    const data = typeof chunk === 'string' ? bytes(chunk) : chunk;
    parts.push(data);
    size += data.length;
  };
  objects.forEach((chunks, i) => {
    offsets.push(size);
    push(`${i + 1} 0 obj\n`);
    chunks.forEach(push);
    push('\nendobj\n');
  });
  const xref = size;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach(o => push(`${String(o).padStart(10, '0')} 00000 n \n`));
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(size);
  let at = 0;
  parts.forEach(p => {
    out.set(p, at);
    at += p.length;
  });
  return out;
}

// В PDF схема всегда светлая, как на бумаге, какой бы ни была тема Obsidian.
const PAPER = {
  bg: '#ffffff',
  ink: '#1d1a0f',
  text: '#222222',
  yellow: '#ffdf4f',
  yellowLine: '#d9ac00',
  blue: '#a9d3ff',
  blueLine: '#2f78c4',
  blueEdge: '#1f5f9f',
};
const EXPORT_TOP = 46;
const BLOCK_PAD_X = 10.5;
const BLOCK_PAD_Y = 19;

// ---------- Экран ----------

const DRAFT = '__draft__';
const LONG_PRESS_MS = 420;
const TAP_SLOP = 8;
const MIN_BLOCK_H = 44;
const HANDLE_GAP = 24;
const HANDLE_SIDE_GAP = 8;
const READABLE_ZOOM = 0.9;
const MIN_FIT_ZOOM = 0.3;
const SAVE_DELAY_MS = 250;

const TIP_START_RU = 'Напиши мысль и нажми кнопку справа внизу на клавиатуре: следующий блок начнётся сам. Для решений, учёбы и дебатов есть «Разбор» внизу.';
const TIP_SELECT_RU = 'Плюс снизу начинает следующий блок, плюс справа начинает блок рядом. Удержи блок, чтобы перенести его.';
const HELP_LINES_RU = [
  'Нажми на блок: снизу и справа появятся плюсы, слева значок сворачивания ветки.',
  'Кнопка справа внизу на клавиатуре сохраняет блок и сразу начинает следующий. «Рядом» начинает соседний блок.',
  'Вопрос на стрелке подбирается сам и учится на твоих исправлениях. Нажми на подпись стрелки, чтобы увидеть все вопросы сразу. На ПК вопрос выбирается цифрой, а во время ввода клавишей Alt с цифрой.',
  'Разбор: выбери «Решение», «Тему» или «Дебаты» и напиши свой вопрос, тему или резолюцию. Плагин построит каркас и спросит по шагам.',
  'В дебатах выбери позицию (ОП, ОО, ЗП, ЗО): твоя сторона жёлтая, соперник синий, а на каждый его аргумент будет шаг «Чем ответить?». Наверху идёт таймер на 15 минут подготовки.',
  'Каждый твой аргумент разбирается по FRIC: почему правда, пример, к чему ведёт, почему важнее. Буквы Р И С на блоке аргумента горят, когда звено заполнено. У ЗП и ЗО есть раздел «Расширение»: то новое, чего не скажет первый стол.',
  'План речи в меню с тремя точками собирает дерево в заметку по спикерам. По ней удобно говорить с телефона.',
  'Тренировка открывается значком таймера: на телефоне он в меню действий (кнопка с тремя полосками внизу), на ПК на левой панели. Там случайная резолюция, 15 минут подготовки по шагам и 7 минут речи. Каждая тренировка сохраняется заметкой в папке «Тренировки».',
  'Повторное нажатие на выбранный блок открывает правку текста.',
  'Удержи блок и перетащи: на середину другого блока, чтобы поставить под него, на его край, чтобы поставить рядом.',
  'Кнопка «Оппонент» перекрашивает блок вместе с веткой. «Ответить» у блока соперника начинает твой ответ на него. «Свести» соединяет несколько веток в один блок.',
  'Экспорт в PDF находится в меню с тремя точками в правом верхнем углу. Файл появится рядом со схемой, в нём всё дерево целиком на белом фоне.',
];

const siblingQuestion = q => (canonQ(q) === 'Да' ? tr('Нет') : q);

const KINDS_RU = [['life', 'Решение'], ['study', 'Тема'], ['debate', 'Дебаты']];
// Выбор позиции в мастере: четыре стола БП и подготовка без позиции.
const RIC_RU = [['r', 'Р', 'почему правда'], ['i', 'И', 'к чему ведёт'], ['c', 'С', 'почему важнее']];
// Поля и рамка блока по горизонтали: столько ширины не достаётся тексту.
const TEXT_INSET = 22;

function el(parent, tag, cls, text) {
  const e = activeDocument.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

function button(parent, cls, label, onClick, icon) {
  const b = el(parent, 'button', cls, icon ? undefined : label);
  if (icon) {
    setIcon(b, icon);
    b.classList.add('lt-icon');
    b.setAttribute('aria-label', label);
  }
  b.addEventListener('click', onClick);
  return b;
}

class LogicTreeView extends TextFileView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.doc = emptyDoc();
    this.broken = null;
    this.sel = null;
    this.edit = null;
    this.editorH = MIN_BLOCK_H;
    this.editorW = NODE_W;
    this.sizes = new Map();
    this.fontFamily = '';
    this.mode = null;
    this.marked = new Set();
    this.questionIds = [];
    this.customOpen = false;
    this.panelOpen = false;
    this.panelList = [];
    this.stripList = [];
    this.wiz = null;
    this.drag = null;
    this.history = [];
    this.anchor = null;
    this.geom = null;
    this.boxes = new Map();
    this.view = { x: 0, y: 0, k: 1 };
    this.pendingRender = true;
    this.pendingFit = true;
    this.buildUi();
    this.bindKeys();
    // Слова измерены шрифтом, который мог ещё не загрузиться: после загрузки размеры считаются заново.
    if (activeDocument.fonts && activeDocument.fonts.ready) {
      activeDocument.fonts.ready.then(() => {
        this.sizes.clear();
        if (this.viewport.clientWidth) this.render();
      });
    }
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return this.file ? this.file.basename : 'Logic Tree'; }
  getIcon() { return 'network'; }
  getViewData() { return this.broken !== null ? this.broken : JSON.stringify(this.doc, null, 1); }

  clear() {
    this.doc = emptyDoc();
    this.broken = null;
    this.sel = null;
    this.history = [];
  }

  setViewData(data, clear) {
    this.broken = null;
    try {
      this.doc = parseDoc(data);
    } catch {
      this.broken = data;
      this.doc = emptyDoc();
    }
    if (clear) {
      this.sel = null;
      this.history = [];
      this.mode = null;
      this.wiz = null;
      this.panelOpen = false;
      this.marked.clear();
      this.closeEditor();
      this.geom = null;
      this.pendingFit = true;
      this.boxes.forEach(b => b.remove());
      this.boxes.clear();
    }
    if (this.sel && !this.node(this.sel)) this.sel = null;
    if (this.edit && this.edit.kind === 'node' && !this.node(this.edit.id)) this.closeEditor();
    // Файл могли изменить снаружи: разбор без каркаса продолжать нельзя.
    if (this.mode === 'wizard' && (this.wiz.stage === 'steps' || this.wiz.change) && !analysisSteps(this.doc).length) {
      this.mode = null;
      this.wiz = null;
    }
    this.render();
    if (this.pendingFit && this.viewport.clientWidth) {
      this.pendingFit = false;
      this.fit(false);
    }
    if (clear && !this.doc.nodes.length && this.broken === null) {
      this.beginDraft({ parents: [], q: '', side: '' });
      // Сразу после открытия файла Obsidian сам переводит фокус на вкладку.
      window.setTimeout(() => {
        if (this.edit) this.editor.focus({ preventScroll: true });
      }, 150);
    }
  }

  async onUnloadFile(file) {
    if (this.edit) this.finishEdit();
    window.clearTimeout(this.saveTimer);
    return super.onUnloadFile(file);
  }

  node(id) { return blockOf(this.doc, id); }

  buildUi() {
    const root = this.contentEl;
    root.classList.add('lt-root');

    // Клавиатура не должна закрываться от нажатий по кнопкам и блокам.
    const keepFocus = e => {
      if (!e.target.matches || !e.target.matches('input, textarea')) e.preventDefault();
    };

    this.viewport = el(root, 'div', 'lt-viewport');
    // Обе метки проверяет распознаватель свайпов Obsidian: боковые панели не откроются при перетаскивании.
    this.viewport.dataset.ignoreSwipe = 'true';
    this.viewport.addEventListener('mousedown', keepFocus);
    this.viewport.addEventListener('scroll', () => {
      this.viewport.scrollTop = 0;
      this.viewport.scrollLeft = 0;
    });

    this.stage = el(this.viewport, 'div', 'lt-stage');
    const NS = 'http://www.w3.org/2000/svg';
    this.svg = activeDocument.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'lt-svg');
    this.paths = new Map();
    for (const dim of [true, false]) {
      for (const kind of ['line', 'head']) {
        for (const side of ['own', 'opp']) {
          const p = activeDocument.createElementNS(NS, 'path');
          p.setAttribute('class', `lt-${kind} lt-${side}${dim ? ' is-dim' : ''}`);
          this.svg.appendChild(p);
          this.paths.set(`${kind}-${side}-${dim}`, p);
        }
      }
    }
    this.stage.appendChild(this.svg);
    this.layer = el(this.stage, 'div', 'lt-layer');
    this.labels = el(this.layer, 'div', 'lt-labels');
    this.buildEditor();

    this.overlay = el(this.viewport, 'div', 'lt-overlay');
    this.handles = {
      below: this.buildHandle('below', tr('Добавить блок ниже'), 'plus', () => this.onHandleBelow()),
      beside: this.buildHandle('beside', tr('Добавить блок рядом'), 'plus', () => this.onHandleBeside()),
      fold: this.buildHandle('fold', tr('Свернуть или развернуть ветку'), 'chevron-up', () => this.toggleFold(this.sel)),
    };
    this.ghost = el(this.viewport, 'div', 'lt-ghost');
    this.hint = el(this.viewport, 'div', 'lt-hint');
    this.emptyEl = el(this.viewport, 'div', 'lt-empty', tr('Здесь пока пусто. Нажми «Тезис», чтобы начать схему, или значок со списком, чтобы разобрать решение, тему или резолюцию.'));
    this.brokenEl = el(this.viewport, 'div', 'lt-empty lt-broken-note', tr('Этот файл не читается как дерево, поэтому плагин его не меняет. Открой его в другом приложении или верни прошлую версию через «Восстановление файлов» в настройках Obsidian.'));
    this.tip = el(this.viewport, 'div', 'lt-tip');
    this.tipText = el(this.tip, 'div', 'lt-tip-text');
    this.tipClose = button(this.tip, 'lt-tip-close', tr('Закрыть подсказку'), () => this.dismissTip(), 'x');
    this.tip.addEventListener('pointerdown', e => e.stopPropagation());
    this.buildHelp();
    this.bindGestures();

    this.pill = el(root, 'div', 'lt-pill');
    this.pill.addEventListener('mousedown', keepFocus);
    this.dock = el(root, 'div', 'lt-dock');
    this.dock.addEventListener('mousedown', keepFocus);
    this.strip = el(root, 'div', 'lt-strip');
    this.strip.addEventListener('mousedown', keepFocus);
    this.stripSide = el(this.strip, 'button', 'lt-strip-side');
    this.stripSide.addEventListener('click', () => this.toggleDraftSide());
    this.stripAll = button(this.strip, 'lt-btn lt-strip-all', tr('Все вопросы'), () => this.openPanel(), 'layout-grid');
    this.chips = el(this.strip, 'div', 'lt-strip-chips');
    this.custom = el(this.strip, 'input', 'lt-custom');
    this.custom.type = 'text';
    this.custom.placeholder = tr('Свой вопрос');
    this.custom.setAttribute('enterkeyhint', 'done');
    this.custom.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        e.stopPropagation();
        this.applyCustom();
      }
    });
    this.custom.addEventListener('change', () => this.applyCustom());
    this.stripBeside = button(this.strip, 'lt-btn lt-strip-beside', tr('Рядом'), () => this.onBeside());
    this.stripAnalyze = button(this.strip, 'lt-btn lt-strip-analyze', tr('Разбор'), () => this.startAnalysis());
    this.buildPanel(root, keepFocus);
    this.buildWizard(root, keepFocus);
    this.registerInterval(window.setInterval(() => this.paintTimer(), 1000));

    const observer = new ResizeObserver(() => {
      if (!this.viewport.clientWidth) return;
      if (this.pendingRender) this.render();
      if (this.pendingFit) {
        this.pendingFit = false;
        this.fit(false);
      }
      if (this.edit) this.reveal(this.editTarget());
      else if (this.mode === 'wizard' || this.mode === 'question') this.reveal(this.sel);
      else this.placeHandles();
    });
    observer.observe(this.viewport);
    this.register(() => observer.disconnect());

    this.registerDomEvent(window, 'keyboardWillHide', () => {
      if (this.edit && !this.editor.value.trim()) {
        this.finishEdit();
        this.editor.blur();
      }
    });
    this.registerDomEvent(activeDocument, 'visibilitychange', () => {
      if (activeDocument.visibilityState !== 'hidden') return;
      if (this.edit && this.editor.value.trim()) this.finishEdit();
      this.flushSave();
    });
  }

  buildEditor() {
    const ed = el(this.layer, 'textarea', 'lt-editor');
    this.editor = ed;
    ed.rows = 1;
    ed.setAttribute('autocapitalize', 'sentences');
    ed.hide();
    ed.addEventListener('keydown', e => {
      if (e.isComposing) return;
      if (e.altKey && /^Digit[1-9]$/.test(e.code)) {
        e.preventDefault();
        const q = this.stripList[Number(e.code.slice(5)) - 1];
        if (q && this.editHasParents()) this.setQuestion(q);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.onEnter();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        this.onBeside();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.cancelEdit();
      }
    });
    ed.addEventListener('beforeinput', e => {
      if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') {
        e.preventDefault();
        this.onEnter();
      }
    });
    // Запасной путь: некоторые клавиатуры Android присылают перевод строки только как текст.
    ed.addEventListener('input', () => {
      if (ed.value.includes('\n')) {
        const typedEnter = /\n\s*$/.test(ed.value);
        ed.value = ed.value.replace(/\s*\n\s*/g, ' ').trim();
        if (typedEnter) {
          this.onEnter();
          return;
        }
      }
      this.editorChanged();
    });
  }

  buildHandle(action, label, icon, onClick) {
    const b = button(this.overlay, 'lt-handle', label, onClick, icon);
    b.dataset.action = action;
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('mousedown', e => e.preventDefault());
    return b;
  }

  buildHelp() {
    this.help = el(this.viewport, 'div', 'lt-help');
    this.help.hide();
    this.help.addEventListener('pointerdown', e => e.stopPropagation());
    // Закрытие наверху: список длинный, и кнопка внизу уходила за край экрана.
    const head = el(this.help, 'div', 'lt-help-head');
    el(head, 'div', 'lt-help-title', tr('Как пользоваться'));
    button(head, 'lt-btn lt-help-close', tr('Закрыть справку'), () => { this.help.hide(); }, 'x');
    const list = el(this.help, 'ul', 'lt-help-list');
    HELP_LINES.forEach(line => el(list, 'li', '', line));
  }

  // Панель со всеми вопросами сразу: без прокрутки, на ПК с выбором цифрой.
  buildPanel(root, keepFocus) {
    this.qpanel = el(root, 'div', 'lt-qpanel');
    this.qpanel.hide();
    this.qpanel.addEventListener('mousedown', keepFocus);
    const head = el(this.qpanel, 'div', 'lt-qhead');
    el(head, 'div', 'lt-qtitle', tr('Вопрос на стрелке'));
    button(head, 'lt-btn lt-qclose', tr('Закрыть'), () => this.closePanel(), 'x');
    this.qgrid = el(this.qpanel, 'div', 'lt-qgrid');
    const form = el(this.qpanel, 'form', 'lt-qfoot');
    this.qcustom = el(form, 'input', 'lt-qcustom');
    this.qcustom.type = 'text';
    this.qcustom.placeholder = tr('Свой вопрос');
    this.qcustom.setAttribute('enterkeyhint', 'done');
    this.qnone = button(form, 'lt-btn lt-qnone', tr('Без вопроса'), () => this.pickQuestion(''));
    this.qnone.type = 'button';
    form.addEventListener('submit', e => {
      e.preventDefault();
      const q = this.qcustom.value.trim();
      if (q) this.pickQuestion(q);
    });
  }

  buildWizard(root, keepFocus) {
    const w = el(root, 'div', 'lt-wizard');
    this.wizEl = w;
    w.hide();
    w.addEventListener('mousedown', keepFocus);
    const head = el(w, 'div', 'lt-wiz-head');
    this.wizBack = button(head, 'lt-btn lt-wiz-back', tr('Предыдущий шаг'), () => this.wizardBack(), 'arrow-left');
    this.wizCount = el(head, 'div', 'lt-wiz-count');
    this.wizSide = el(head, 'button', 'lt-wiz-side');
    this.wizSide.type = 'button';
    this.wizSideName = el(this.wizSide, 'span', 'lt-wiz-side-name');
    setIcon(el(this.wizSide, 'span', 'lt-wiz-side-icon'), 'chevrons-up-down');
    this.wizSide.addEventListener('click', () => this.openSide());
    this.wizTimer = el(head, 'div', 'lt-wiz-timer');
    this.wizTimer.setAttribute('role', 'timer');
    el(head, 'div', 'lt-wiz-gap');
    // Счётчик виден в подсказке поля ввода, а эта строка читается программами экранного доступа.
    this.wizAdded = el(head, 'div', 'lt-wiz-added');
    this.wizAdded.setAttribute('aria-live', 'polite');
    this.wizUndo = button(head, 'lt-btn lt-wiz-undo', tr('Отменить последнее'), () => this.undo(), 'undo-2');
    button(head, 'lt-btn lt-wiz-close', tr('Закрыть разбор'), () => this.closeWizard(), 'x');
    this.wizKinds = el(w, 'div', 'lt-wiz-kinds');
    this.wizKinds.setAttribute('role', 'group');
    this.wizKinds.setAttribute('aria-label', tr('Что разбираем'));
    this.kindButtons = KINDS.map(([kind, label]) => {
      const b = el(this.wizKinds, 'button', 'lt-wiz-kind', label);
      b.type = 'button';
      b.dataset.kind = kind;
      b.addEventListener('click', () => this.setKind(kind));
      return b;
    });
    this.wizPace = el(w, 'div', 'lt-wiz-pace');
    this.wizPrompt = el(w, 'div', 'lt-wiz-prompt');
    this.wizHint = el(w, 'div', 'lt-wiz-hint');
    this.wizTypes = el(w, 'div', 'lt-wiz-types');
    this.wizChips = el(w, 'div', 'lt-wiz-chips');
    this.wizChips.setAttribute('role', 'group');
    this.wizChips.setAttribute('aria-label', tr('Критерии сравнения'));
    const form = el(w, 'form', 'lt-wiz-form');
    this.wizInput = el(form, 'input', 'lt-wiz-input');
    this.wizInput.type = 'text';
    this.wizInput.setAttribute('enterkeyhint', 'done');
    this.wizInput.setAttribute('autocapitalize', 'sentences');
    this.wizAdd = button(form, 'lt-btn lt-wiz-add', tr('Добавить блок'), () => {}, 'plus');
    this.wizAdd.type = 'submit';
    this.wizNext = button(form, 'lt-btn lt-primary lt-wiz-next', tr('Дальше'), () => this.wizardNext());
    this.wizNext.type = 'button';
    form.addEventListener('submit', e => {
      e.preventDefault();
      this.wizardSubmit();
    });
  }

  bindKeys() {
    const typing = () => {
      const a = activeDocument.activeElement;
      return Boolean(a && a.matches && a.matches('input, textarea'));
    };
    this.scope = new Scope(this.app.scope);
    this.scope.register(['Mod'], 'z', () => {
      if (typing()) return true;
      this.undo();
      return false;
    });
    this.scope.register([], 'Delete', () => {
      if (typing() || this.mode || !this.sel) return true;
      this.removeSelected();
      return false;
    });
    this.scope.register([], 'Enter', () => {
      if (typing() || this.mode || !this.sel) return true;
      this.onHandleBelow();
      return false;
    });
    this.scope.register([], 'Escape', () => {
      if (typing() || !this.mode || this.mode === 'wizard') return true;
      if (this.mode === 'question') this.closePanel();
      else this.setMode(null);
      return false;
    });
    for (let n = 1; n <= 9; n++) {
      this.scope.register([], String(n), () => {
        if (typing() || this.mode !== 'question') return true;
        const q = this.panelList[n - 1];
        if (q !== undefined) this.pickQuestion(q);
        return false;
      });
    }
  }

  bindGestures() {
    const vp = this.viewport;
    const points = new Map();
    let moved = 0;
    let downTarget = null;
    let pressTimer = null;
    const clearPress = () => {
      window.clearTimeout(pressTimer);
      pressTimer = null;
    };

    vp.addEventListener('pointerdown', e => {
      if (e.target === this.editor || e.button > 0) return;
      if (points.size) {
        moved = 99;
        downTarget = null;
        clearPress();
      } else {
        moved = 0;
        downTarget = e.target;
      }
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      vp.setPointerCapture(e.pointerId);
      this.stage.setCssProps({ 'transition': '' });
      const box = downTarget && downTarget.closest ? downTarget.closest('.lt-node') : null;
      if (box && !this.mode && !this.edit) {
        pressTimer = window.setTimeout(() => {
          pressTimer = null;
          const p = points.get(e.pointerId);
          if (p) this.startDrag(box.dataset.id, p.x, p.y);
        }, LONG_PRESS_MS);
      }
    });

    vp.addEventListener('pointermove', e => {
      const p = points.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (this.drag) {
        this.moveDrag(e.clientX, e.clientY);
      } else if (points.size === 1) {
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > TAP_SLOP) {
          clearPress();
          this.view.x += dx;
          this.view.y += dy;
          this.apply();
        }
      } else if (points.size === 2) {
        const other = [...points.entries()].find(([id]) => id !== e.pointerId)[1];
        const before = Math.hypot(p.x - other.x, p.y - other.y);
        const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        const rect = vp.getBoundingClientRect();
        this.view.x += dx / 2;
        this.view.y += dy / 2;
        if (before > 0) this.zoomAt((e.clientX + other.x) / 2 - rect.left, (e.clientY + other.y) / 2 - rect.top, after / before);
      }
      p.x = e.clientX;
      p.y = e.clientY;
    });

    const release = e => {
      if (!points.delete(e.pointerId)) return;
      clearPress();
      if (this.drag) {
        if (!points.size) this.endDrag(e.type === 'pointerup');
        return;
      }
      if (e.type === 'pointerup' && !points.size && moved <= TAP_SLOP && downTarget) this.onTap(downTarget);
    };
    vp.addEventListener('pointerup', release);
    vp.addEventListener('pointercancel', release);
    vp.addEventListener('lostpointercapture', release);

    vp.addEventListener('wheel', e => {
      e.preventDefault();
      this.stage.setCssProps({ 'transition': '' });
      if (e.ctrlKey) {
        const rect = vp.getBoundingClientRect();
        this.zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.01));
      } else {
        this.view.x -= e.deltaX;
        this.view.y -= e.deltaY;
        this.apply();
      }
    }, { passive: false });

    // На телефоне Obsidian превращает долгое нажатие в контекстное меню: здесь оно занято переносом.
    vp.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (Platform.isMobile) return;
      const box = e.target.closest ? e.target.closest('.lt-node') : null;
      if (!box || this.edit || this.mode) return;
      this.select(box.dataset.id);
      this.showMenu(e);
    });
  }

  // ---------- Камера ----------

  zoomAt(x, y, factor) {
    const k = Math.min(2.5, Math.max(0.2, this.view.k * factor));
    const ratio = k / this.view.k;
    this.view.x = x - (x - this.view.x) * ratio;
    this.view.y = y - (y - this.view.y) * ratio;
    this.view.k = k;
    this.apply();
  }

  apply(smooth) {
    this.stage.setCssProps({ 'transition': smooth ? 'transform .2s cubic-bezier(.16, 1, .3, 1)' : '' });
    this.stage.setCssProps({ 'transform': `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.k})` });
    this.overlay.classList.toggle('lt-smooth', Boolean(smooth));
    this.placeHandles();
  }

  // Сколько снизу занимают панели поверх схемы.
  bottomReserve() {
    const box = this.viewport.getBoundingClientRect();
    let top = box.bottom;
    [this.strip, this.dock, this.pill, this.qpanel, this.wizEl, activeDocument.querySelector('.mobile-navbar')].forEach(x => {
      if (!x) return;
      const style = getComputedStyle(x);
      if (style.display === 'none' || style.opacity === '0') return;
      const r = x.getBoundingClientRect();
      if (r.height && r.top < top && r.top > box.top) top = r.top;
    });
    return box.bottom - top;
  }

  // Сколько сверху занимают подсказки поверх схемы.
  topReserve() {
    const box = this.viewport.getBoundingClientRect();
    let bottom = box.top;
    [this.tip, this.hint].forEach(x => {
      if (x.style.display === 'none') return;
      bottom = Math.max(bottom, x.getBoundingClientRect().bottom);
    });
    return bottom - box.top;
  }

  fit(smooth) {
    const g = this.geom;
    if (!g || !g.width) return;
    const vw = this.viewport.clientWidth;
    const top = this.topReserve();
    const vh = this.viewport.clientHeight - this.bottomReserve() - top;
    const k = Math.max(MIN_FIT_ZOOM, Math.min(vw / g.width, vh / g.height, 1));
    this.view.k = k;
    this.view.x = (vw - g.width * k) / 2;
    this.view.y = top + (g.height * k < vh ? (vh - g.height * k) / 2 : 0);
    this.apply(smooth);
  }

  editTarget() {
    if (!this.edit) return this.sel;
    return this.edit.kind === 'draft' ? DRAFT : this.edit.id;
  }

  // При вводе текст должен быть читаем, а блок виден над полоской.
  follow() {
    const id = this.editTarget();
    const p = id && this.geom && this.geom.pos[id];
    if (!p) return;
    if (this.edit && !this.doc.nodes.length) this.view.x = this.viewport.clientWidth / 2 - (p.x + p.w / 2) * this.view.k;
    if (this.edit) this.readable(p);
    this.reveal(id);
  }

  readable(p) {
    if (this.view.k >= READABLE_ZOOM) return;
    this.view.k = 1;
    this.view.x = this.viewport.clientWidth / 2 - (p.x + p.w / 2);
    this.view.y = (this.viewport.clientHeight - this.bottomReserve()) * 0.45 - (p.y + p.h / 2);
  }

  // Показывает блок крупно: для шагов разбора и выбора вопроса.
  focusOn(id) {
    const p = id && this.geom && this.geom.pos[id];
    if (!p) return;
    this.readable(p);
    this.reveal(id);
  }

  reveal(id) {
    const p = id && this.geom && this.geom.pos[id];
    if (!p) return;
    const { k } = this.view;
    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight - this.bottomReserve();
    const w = p.w * k;
    const h = p.h * k;
    const left = p.x * k + this.view.x;
    const top = p.y * k + this.view.y;
    const side = Math.max(0, Math.min(36, (vw - w) / 2));
    const topLimit = Math.max(28, this.topReserve() + 12);
    const bottomLimit = vh - (this.edit ? 24 : 64);
    let dx = 0;
    let dy = 0;
    if (left < side) dx = side - left;
    else if (left + w > vw - side) dx = vw - side - (left + w);
    if (top < topLimit) dy = topLimit - top;
    else if (top + h > bottomLimit) dy = Math.max(bottomLimit - (top + h), topLimit - top);
    this.view.x += dx;
    this.view.y += dy;
    this.apply(true);
  }

  placeHandles() {
    const p = this.sel && this.geom && this.geom.pos[this.sel];
    const show = Boolean(p) && !this.edit && !this.mode && !this.drag;
    this.overlay.classList.toggle('is-hidden', !show);
    if (!show) return;
    const { k, x, y } = this.view;
    const left = p.x * k + x;
    const top = p.y * k + y;
    const w = p.w * k;
    const h = p.h * k;
    const put = (b, px, py) => {
      b.setCssProps({ 'left': `${px}px` });
      b.setCssProps({ 'top': `${py}px` });
    };
    // На крупном масштабе значки не закрывают соседа, на мелком не закрывают сам блок.
    const side = k >= READABLE_ZOOM * 0.8 ? HANDLE_SIDE_GAP : HANDLE_GAP;
    const node = this.node(this.sel);
    // У свёрнутого блока под нижним краем висит счётчик: плюс не должен его перекрывать.
    put(this.handles.below, left + w / 2, top + h + HANDLE_GAP + (node && node.collapsed ? 12 : 0));
    put(this.handles.beside, left + w + side, top + h / 2);
    put(this.handles.fold, left - side, top + h / 2);
    const hasKids = childrenOf(this.doc, this.sel).length > 0;
    this.handles.fold.setCssProps({ 'display': hasKids ? '' : 'none' });
    setIcon(this.handles.fold, node && node.collapsed ? 'chevron-down' : 'chevron-up');
  }

  // ---------- Рисование ----------

  render() {
    if (!this.viewport.clientWidth) {
      this.pendingRender = true;
      this.paint();
      return;
    }
    this.pendingRender = false;
    const visible = visibleIds(this.doc);
    if (this.sel && !visible.has(this.sel)) this.sel = null;
    const { edit } = this;
    const draft = edit && edit.kind === 'draft' ? edit : null;
    const nodes = this.doc.nodes
      .filter(n => visible.has(n.id))
      .map(n => (edit && edit.kind === 'node' && edit.id === n.id ? { ...n, q: edit.q } : n));
    const edges = this.doc.edges.filter(e => visible.has(e[0]) && visible.has(e[1])).map(e => e.slice());
    if (draft) {
      const virtual = { id: DRAFT, text: '', q: draft.q };
      const at = draft.after && !draft.parents.length ? nodes.findIndex(n => n.id === draft.after) : -1;
      if (at >= 0) nodes.splice(at + 1, 0, virtual);
      else nodes.push(virtual);
      draft.parents.forEach(p => insertEdge(edges, p, DRAFT, draft.after));
    }

    const alive = new Set();
    const heights = {};
    const widths = {};
    const hasParent = new Set(this.doc.edges.map(e => e[1]));
    const ric = new Map(fricTargets(this.doc).map(id => [id, ricOf(this.doc, id)]));
    const family = getComputedStyle(this.contentEl).fontFamily || 'sans-serif';
    if (family !== this.fontFamily) {
      this.fontFamily = family;
      this.sizes.clear();
    }
    nodes.forEach(n => {
      if (n.id === DRAFT) {
        heights[DRAFT] = this.editorH;
        widths[DRAFT] = this.editorW;
        return;
      }
      const editing = Boolean(edit) && edit.kind === 'node' && edit.id === n.id;
      const width = editing ? this.editorW : blockWidth(n.text, !hasParent.has(n.id));
      const size = this.sizeOf(n.text, width);
      widths[n.id] = width;
      alive.add(n.id);
      let b = this.boxes.get(n.id);
      if (!b) {
        b = el(this.layer, 'div', 'lt-node');
        b.dataset.id = n.id;
        el(b, 'span', 'lt-text');
        setIcon(el(b, 'span', 'lt-check'), 'check');
        this.boxes.set(n.id, b);
      }
      const text = b.querySelector('.lt-text');
      if (text.textContent !== n.text) text.textContent = n.text;
      b.classList.toggle('lt-short', size === FONT_SIZES[0]);
      b.classList.toggle('lt-small', size === FONT_SIZES[2]);
      b.classList.toggle('lt-wide', width > NODE_W);
      b.classList.toggle('lt-opp', n.side === 'o');
      b.classList.toggle('lt-head', n.h === true);
      this.syncCount(b, n.collapsed ? hiddenCount(this.doc, n.id, visible) : 0);
      this.syncRic(b, ric.get(n.id));
      heights[n.id] = editing ? this.editorH : b.offsetHeight;
    });
    this.boxes.forEach((b, id) => {
      if (alive.has(id)) return;
      b.remove();
      this.boxes.delete(id);
    });

    const g = layout(nodes, edges, heights, widths);
    const before = this.anchor && this.geom && this.geom.pos[this.anchor];
    const after = this.anchor && g.pos[this.anchor];
    if (before && after) {
      this.view.x += (before.x - after.x) * this.view.k;
      this.view.y += (before.y - after.y) * this.view.k;
    }
    this.anchor = null;
    this.geom = g;

    this.boxes.forEach((b, id) => {
      b.setCssProps({ 'left': `${g.pos[id].x}px` });
      b.setCssProps({ 'top': `${g.pos[id].y}px` });
    });
    this.svg.setAttribute('width', g.width);
    this.svg.setAttribute('height', g.height);
    this.labels.textContent = '';
    g.labels.forEach(l => {
      const t = el(this.labels, 'div', `lt-label${l.place === 'child' ? ' lt-label-narrow' : ''}`, l.text);
      t.setCssProps({ 'left': `${l.x}px` });
      t.setCssProps({ 'top': `${l.y}px` });
      t.dataset.ids = l.ids.join(',');
    });
    this.placeEditor();
    this.apply();
    this.paint();
  }

  // Размер шрифта блока: измеряем слова тем же шрифтом, что на экране. Результат запоминается.
  sizeOf(text, width) {
    const key = `${width}|${text}`;
    let size = this.sizes.get(key);
    if (size) return size;
    if (!this.probe) this.probe = activeDocument.createElement('canvas').getContext('2d');
    size = pickSize(text, width - TEXT_INSET, (word, px) => {
      this.probe.font = `700 ${px}px ${this.fontFamily}`;
      return this.probe.measureText(word.toUpperCase()).width;
    });
    if (this.sizes.size > 2000) this.sizes.clear();
    this.sizes.set(key, size);
    return size;
  }

  // Буквы Р И С на своём аргументе: какие звенья FRIC уже есть под ним.
  syncRic(box, ric) {
    let badge = box.querySelector('.lt-ric');
    if (!ric) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = el(box, 'span', 'lt-ric');
      badge.setAttribute('role', 'img');
      RIC.forEach(([, letter]) => el(badge, 'span', 'lt-ric-letter', letter));
    }
    RIC.forEach(([key], i) => badge.children[i].classList.toggle('is-on', ric[key]));
    const missing = RIC.filter(([key]) => !ric[key]).map(r => r[2]);
    badge.title = missing.length ? tr('Не хватает: {list}', { list: missing.join(', ') }) : tr('Все звенья FRIC на месте');
    badge.setAttribute('aria-label', badge.title);
  }

  syncCount(box, hidden) {
    let count = box.querySelector('.lt-count');
    if (!hidden) {
      if (count) count.remove();
      return;
    }
    if (!count) {
      count = el(box, 'button', 'lt-count');
      count.setAttribute('aria-label', tr('Развернуть ветку'));
    }
    count.textContent = `+${hidden}`;
  }

  placeEditor() {
    const id = this.edit ? this.editTarget() : null;
    const p = id && this.geom && this.geom.pos[id];
    if (!p) return;
    this.editor.setCssProps({ 'left': `${p.x}px` });
    this.editor.setCssProps({ 'top': `${p.y}px` });
    this.editor.classList.toggle('lt-opp', this.editSide() === 'o');
  }

  editSide() {
    if (!this.edit) return '';
    if (this.edit.kind === 'draft') return this.edit.side;
    const n = this.node(this.edit.id);
    return n && n.side === 'o' ? 'o' : '';
  }

  focusSet() {
    if (!this.plugin.data.focus || (this.mode && this.mode !== 'wizard')) return null;
    if (this.edit && this.edit.kind === 'draft') {
      const set = focusIds(this.doc, this.edit.parents);
      set.add(DRAFT);
      return set;
    }
    const id = this.edit ? this.edit.id : this.sel;
    return id ? focusIds(this.doc, [id]) : null;
  }

  drawLines(focus) {
    const d = new Map();
    const push = (key, s) => d.set(key, (d.get(key) || '') + s);
    const sideOf = id => {
      if (id === DRAFT) return this.edit && this.edit.side === 'o' ? 'opp' : 'own';
      const n = this.node(id);
      return n && n.side === 'o' ? 'opp' : 'own';
    };
    if (this.geom) {
      this.geom.paths.forEach(p => {
        const dim = Boolean(focus) && !(focus.has(p.from) && focus.has(p.to));
        push(`line-${sideOf(p.to)}-${dim}`, `M${p.pts.map(c => c.join(' ')).join('L')}`);
      });
      this.geom.arrows.forEach(a => {
        const dim = Boolean(focus) && !focus.has(a.to);
        push(`head-${sideOf(a.to)}-${dim}`, `M${a.x - 7} ${a.y - 10}L${a.x + 7} ${a.y - 10}L${a.x} ${a.y}Z`);
      });
    }
    this.paths.forEach((p, key) => p.setAttribute('d', d.get(key) || ''));
  }

  paint() {
    const { sel, edit, mode } = this;
    const root = this.contentEl;
    root.classList.toggle('lt-is-broken', this.broken !== null);
    root.classList.toggle('lt-hide-nav', Boolean(sel || edit || mode));
    const focus = this.focusSet();
    this.boxes.forEach((b, id) => {
      b.classList.toggle('is-selected', id === sel && !edit && mode !== 'merge');
      b.classList.toggle('is-marked', mode === 'merge' && this.marked.has(id));
      b.classList.toggle('is-dim', Boolean(focus) && !focus.has(id));
      b.classList.toggle('is-editing', Boolean(edit) && edit.kind === 'node' && edit.id === id);
    });
    this.labels.querySelectorAll('.lt-label').forEach(l => {
      l.classList.toggle('is-dim', Boolean(focus) && !l.dataset.ids.split(',').some(id => focus.has(id)));
    });
    this.drawLines(focus);
    this.paintControls();
    this.paintMessages();
    this.placeHandles();
  }

  paintControls() {
    const broken = this.broken !== null;
    const asking = this.mode === 'question';
    const showWizard = !broken && this.mode === 'wizard';
    const showPanel = !broken && (asking || (this.panelOpen && Boolean(this.edit)));
    const showStrip = !broken && Boolean(this.edit);
    const showDock = !broken && !showStrip && !showWizard && !asking && Boolean(this.sel || this.mode);
    const showPill = !broken && !showStrip && !showDock && !showWizard && !asking;
    this.strip.setCssProps({ 'display': showStrip ? '' : 'none' });
    this.dock.setCssProps({ 'display': showDock ? '' : 'none' });
    this.pill.setCssProps({ 'display': showPill ? '' : 'none' });
    this.qpanel.setCssProps({ 'display': showPanel ? '' : 'none' });
    this.wizEl.setCssProps({ 'display': showWizard ? '' : 'none' });
    if (showStrip) this.renderStrip();
    if (showDock) this.renderDock();
    if (showPill) this.renderPill();
    if (showPanel) this.renderPanel();
    if (showWizard) this.renderWizard();
  }

  paintMessages() {
    const count = this.doc.nodes.length;
    const hints = {
      merge: tr('Отметь блоки, которые сходятся в один'),
      link: tr('Нажми блок, куда провести стрелку. Если стрелка уже есть, она уберётся'),
    };
    const hint = hints[this.mode] || '';
    this.hint.textContent = hint;
    this.hint.setCssProps({ 'display': hint ? '' : 'none' });
    this.emptyEl.setCssProps({ 'display': !count && !this.edit && !this.mode && this.broken === null ? '' : 'none' });
    this.brokenEl.setCssProps({ 'display': this.broken !== null ? '' : 'none' });
    const tip = hint ? null : this.currentTip();
    this.tip.setCssProps({ 'display': tip ? '' : 'none' });
    if (tip) {
      this.tip.dataset.key = tip[0];
      this.tipText.textContent = tip[1];
    }
  }

  currentTip() {
    const seen = this.plugin.data.tips;
    if (!this.doc.nodes.length && this.edit && !seen.start) return ['start', TIP_START];
    if (this.sel && !this.edit && !this.mode && !seen.select) return ['select', TIP_SELECT];
    return null;
  }

  dismissTip() {
    this.markTip(this.tip.dataset.key);
    this.paintMessages();
  }

  markTip(key) {
    if (!key || this.plugin.data.tips[key]) return;
    this.plugin.data.tips[key] = true;
    this.plugin.savePrefs();
  }

  renderPill() {
    this.pill.textContent = '';
    const undo = button(this.pill, 'lt-btn', tr('Назад'), () => this.undo(), 'undo-2');
    undo.disabled = !this.history.length;
    const focus = button(this.pill, 'lt-btn', tr('Фокус на ветке'), () => this.toggleFocus(), 'focus');
    focus.classList.toggle('is-on', Boolean(this.plugin.data.focus));
    focus.setAttribute('aria-pressed', String(Boolean(this.plugin.data.focus)));
    const fit = button(this.pill, 'lt-btn', tr('Вся схема'), () => this.fit(true), 'maximize');
    fit.disabled = !this.doc.nodes.length;
    button(this.pill, 'lt-btn', tr('Разбор'), () => this.startAnalysis(), 'list-checks');
    const add = el(this.pill, 'button', 'lt-btn lt-primary lt-add');
    setIcon(el(add, 'span', 'lt-add-icon'), 'plus');
    el(add, 'span', '', tr('Тезис|кнопка'));
    add.setAttribute('aria-label', tr('Новый тезис'));
    add.addEventListener('click', () => this.beginDraft({ parents: [], q: '', side: '' }));
  }

  renderDock() {
    this.dock.textContent = '';
    if (this.mode === 'merge') {
      button(this.dock, 'lt-btn', tr('Отмена'), () => this.setMode(null));
      const go = button(this.dock, 'lt-btn lt-primary', tr('Свести ({n})', { n: this.marked.size }), () => this.finishMerge());
      go.disabled = this.marked.size < 2;
      return;
    }
    if (this.mode === 'link') {
      button(this.dock, 'lt-btn', tr('Отмена'), () => this.setMode(null));
      return;
    }
    const n = this.node(this.sel);
    const undo = button(this.dock, 'lt-btn', tr('Назад'), () => this.undo(), 'undo-2');
    undo.disabled = !this.history.length;
    const opp = n && n.side === 'o';
    const side = button(this.dock, 'lt-btn', opp ? tr('Моя сторона') : tr('Оппонент'), () => this.toggleSide());
    side.prepend(el(null, 'span', `lt-swatch${opp ? ' is-own' : ''}`));
    // У блока соперника главное действие — ответить. «Связать» тогда остаётся в меню «Ещё».
    if (opp && !n.h) button(this.dock, 'lt-btn lt-primary', tr('Ответить'), () => this.reply());
    button(this.dock, 'lt-btn', tr('Свести'), () => this.startMerge());
    if (!opp || n.h) button(this.dock, 'lt-btn', tr('Связать'), () => this.startLink());
    button(this.dock, 'lt-btn', tr('Ещё'), e => this.showMenu(e), 'more-horizontal');
  }

  renderStrip() {
    const isDraft = Boolean(this.edit) && this.edit.kind === 'draft';
    const canAsk = this.editHasParents();
    const firstBlock = isDraft && !canAsk && !this.doc.nodes.length;
    // Сторона выбирается только у нового тезиса: остальные блоки наследуют её от ветки.
    const opp = this.editSide() === 'o';
    this.stripSide.setCssProps({ 'display': isDraft && !canAsk ? '' : 'none' });
    this.stripSide.className = `lt-strip-side${opp ? ' is-opp' : ''}`;
    this.stripSide.textContent = opp ? tr('Оппонент') : tr('Моя сторона');
    this.stripSide.setAttribute('aria-label', opp ? tr('Сейчас блок оппонента, сделать своим') : tr('Сейчас мой блок, сделать блоком оппонента'));
    this.stripBeside.setCssProps({ 'display': isDraft && !this.customOpen && !firstBlock ? '' : 'none' });
    this.stripAnalyze.setCssProps({ 'display': firstBlock ? '' : 'none' });
    this.stripAll.setCssProps({ 'display': canAsk && !this.customOpen ? '' : 'none' });
    this.custom.setCssProps({ 'display': this.customOpen ? '' : 'none' });
    this.chips.setCssProps({ 'display': canAsk && !this.customOpen ? '' : 'none' });
    this.stripList = [];
    if (!canAsk) return;
    const current = this.currentQuestion();
    const list = this.choices();
    this.stripList = list;
    const key = list.join('\n');
    if (key !== this.chipKey) {
      this.chipKey = key;
      this.chips.textContent = '';
      this.chips.scrollLeft = 0;
      list.forEach((q, i) => {
        const c = button(this.chips, 'lt-chip', q, () => this.setQuestion(this.currentQuestion() === q ? '' : q));
        c.dataset.q = q;
        if (i < 9) {
          c.dataset.n = String(i + 1);
          if (!Platform.isMobile) c.title = `Alt+${i + 1}`;
        }
      });
      button(this.chips, 'lt-chip', tr('Свой…'), () => this.openCustom());
    }
    this.chips.querySelectorAll('.lt-chip').forEach(c => {
      c.classList.toggle('is-on', Boolean(c.dataset.q) && c.dataset.q === current);
    });
  }

  choices() {
    return questionChoices(this.currentQuestion(), this.previousQuestion(), this.plugin.data.stats, this.customQuestions());
  }

  renderPanel() {
    const current = this.currentQuestion();
    this.panelList = this.choices();
    this.qgrid.textContent = '';
    this.panelList.forEach((q, i) => {
      const b = button(this.qgrid, 'lt-qbtn', q, () => this.pickQuestion(q));
      b.dataset.q = q;
      if (i < 9) b.dataset.n = String(i + 1);
      b.classList.toggle('is-on', q === current);
    });
    this.qnone.setCssProps({ 'display': current ? '' : 'none' });
  }

  editHasParents() {
    if (!this.edit) return false;
    return this.edit.kind === 'draft' ? this.edit.parents.length > 0 : parentsOf(this.doc, this.edit.id).length > 0;
  }

  currentQuestion() {
    if (this.mode === 'question') {
      const n = this.node(this.questionIds[0]);
      return n ? n.q : '';
    }
    return this.edit ? this.edit.q : '';
  }

  previousQuestion() {
    let parent = null;
    if (this.mode === 'question') [parent] = parentsOf(this.doc, this.questionIds[0]);
    else if (this.edit && this.edit.kind === 'draft') [parent] = this.edit.parents;
    else if (this.edit) [parent] = parentsOf(this.doc, this.edit.id);
    const n = parent ? this.node(parent) : null;
    return n ? n.q : '';
  }

  customQuestions() {
    return [...new Set(this.doc.nodes.map(n => n.q).filter(q => q && !QUESTIONS.includes(q)))];
  }

  suggest(id) {
    const n = this.node(id);
    return rankQuestions(n ? n.q : '', this.plugin.data.stats, this.customQuestions())[0];
  }

  // ---------- Сохранение и отмена ----------

  remember() {
    this.history.push({ doc: JSON.stringify(this.doc), sel: this.sel });
    if (this.history.length > 80) this.history.shift();
    this.anchor = this.sel;
  }

  scheduleSave() {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.flushSave(), SAVE_DELAY_MS);
  }

  flushSave() {
    window.clearTimeout(this.saveTimer);
    if (this.file && this.broken === null) this.save();
  }

  changed() {
    this.render();
    this.scheduleSave();
    if (this.sel) this.reveal(this.sel);
  }

  undo() {
    const last = this.history.pop();
    if (!last) return;
    this.doc = JSON.parse(last.doc);
    this.sel = last.sel;
    // Разбор остаётся открытым, пока отмена не убрала сам каркас.
    if (this.mode === 'wizard' && this.doc.analysis && this.wiz.stage === 'steps') {
      this.doc.analysis.step = this.wiz.key;
    } else {
      this.mode = null;
      this.wiz = null;
    }
    this.panelOpen = false;
    this.marked.clear();
    this.anchor = this.sel;
    this.changed();
  }

  // ---------- Ввод ----------

  beginDraft({ parents, q, side, after }) {
    this.mode = null;
    this.marked.clear();
    this.customOpen = false;
    this.edit = { kind: 'draft', parents, q: q || '', side: side || '', after: after || null };
    this.showEditor('', parents.length ? tr('Следующий блок') : tr('Главный тезис'), 'next');
  }

  startEditNode(id) {
    const n = this.node(id);
    if (!n) return;
    this.sel = id;
    this.mode = null;
    this.customOpen = false;
    this.edit = { kind: 'node', id, q: n.q };
    this.showEditor(n.text, tr('Текст блока'), 'done');
  }

  showEditor(text, placeholder, enterKey) {
    const ed = this.editor;
    ed.value = text;
    ed.placeholder = placeholder;
    ed.setAttribute('enterkeyhint', enterKey);
    ed.show();
    // То же нажатие, что открыло поле, не должно попасть в него: браузер выделил бы слово.
    ed.addClass('lt-guard');
    window.clearTimeout(this.editorGuard);
    this.editorGuard = window.setTimeout(() => { ed.removeClass('lt-guard'); }, 400);
    this.measureEditor();
    this.render();
    ed.focus({ preventScroll: true });
    ed.setSelectionRange(text.length, text.length);
    this.follow();
  }

  measureEditor() {
    const ed = this.editor;
    const { edit } = this;
    const isRoot = Boolean(edit) && (edit.kind === 'draft' ? !edit.parents.length : !parentsOf(this.doc, edit.id).length);
    this.editorW = blockWidth(ed.value, isRoot);
    ed.setCssProps({ 'width': `${this.editorW}px` });
    ed.setCssProps({ 'height': '' });
    this.editorH = Math.max(MIN_BLOCK_H, ed.scrollHeight);
    ed.setCssProps({ 'height': `${this.editorH}px` });
  }

  editorChanged() {
    const { editorH, editorW } = this;
    this.measureEditor();
    if (this.editorH === editorH && this.editorW === editorW) return;
    this.render();
    this.reveal(this.editTarget());
  }

  closeEditor() {
    this.edit = null;
    this.customOpen = false;
    this.editor.value = '';
    this.editor.hide();
  }

  commitDraft() {
    const { parents, q, side, after } = this.edit;
    const text = this.editor.value.trim();
    const parent = parents.length ? this.node(parents[0]) : null;
    this.remember();
    const id = addBlock(this.doc, { parents, text, q, side, after });
    // Ответ сопернику ставится кнопкой, а не выбором вопроса: подбор вопросов на нём не учится.
    if (parents.length && q !== REPLY_Q) recordTransition(this.plugin.data.stats, parent ? parent.q : '', q);
    this.plugin.savePrefs();
    this.markTip('start');
    this.sel = id;
    this.scheduleSave();
    return id;
  }

  // Сохраняет написанное и закрывает блок. Текст никогда не теряется.
  finishEdit() {
    const { edit } = this;
    if (!edit) return;
    const text = this.editor.value.trim();
    if (edit.kind === 'draft') {
      if (text) this.commitDraft();
      else if (!this.sel) this.sel = edit.parents[0] || null;
    } else {
      const n = this.node(edit.id);
      const q = this.editHasParents() ? edit.q : '';
      if (n && text && (text !== n.text || q !== n.q)) {
        this.remember();
        n.text = text;
        n.q = q;
        this.scheduleSave();
      }
    }
    this.closeEditor();
    this.render();
  }

  cancelEdit() {
    this.closeEditor();
    this.editor.blur();
    this.render();
  }

  onEnter() {
    if (!this.edit) return;
    if (this.edit.kind === 'node' || !this.editor.value.trim()) {
      this.finishEdit();
      this.editor.blur();
      return;
    }
    const { side } = this.edit;
    const id = this.commitDraft();
    this.beginDraft({ parents: [id], q: this.suggest(id), side });
  }

  onBeside() {
    const { edit } = this;
    if (!edit || edit.kind !== 'draft') return;
    if (this.editor.value.trim()) {
      const { parents, q, side } = edit;
      const id = this.commitDraft();
      this.beginDraft({ parents, q: siblingQuestion(q), side, after: id });
      return;
    }
    const base = this.node(edit.parents[0]);
    if (!base) return;
    this.beginDraft({ parents: parentsOf(this.doc, base.id), q: siblingQuestion(base.q), side: base.side || '', after: base.id });
  }

  onHandleBelow() {
    const n = this.node(this.sel);
    if (!n) return;
    this.markTip('select');
    if (n.collapsed) delete n.collapsed;
    this.beginDraft({ parents: [n.id], q: this.suggest(n.id), side: n.side || '' });
  }

  // Ответ на блок: новый блок под ним цветом другой стороны.
  reply() {
    const n = this.node(this.sel);
    if (!n || n.h) return;
    if (n.collapsed) delete n.collapsed;
    this.beginDraft({ parents: [n.id], q: REPLY_Q, side: n.side === 'o' ? '' : 'o' });
  }

  onHandleBeside() {
    const n = this.node(this.sel);
    if (!n) return;
    this.markTip('select');
    this.beginDraft({ parents: parentsOf(this.doc, n.id), q: siblingQuestion(n.q), side: n.side || '', after: n.id });
  }

  toggleDraftSide() {
    if (!this.edit || this.edit.kind !== 'draft') return;
    this.edit.side = this.edit.side === 'o' ? '' : 'o';
    this.placeEditor();
    this.paint();
  }

  // ---------- Вопрос на стрелке ----------

  startQuestion(ids) {
    this.questionIds = ids;
    this.customOpen = false;
    this.qcustom.value = '';
    this.sel = ids[0];
    this.mode = 'question';
    this.paint();
    this.reveal(ids[0]);
  }

  // Панель во время ввода: клавиатура остаётся открытой.
  openPanel() {
    this.panelOpen = true;
    this.qcustom.value = '';
    this.paint();
    this.reveal(this.editTarget());
  }

  closePanel() {
    this.panelOpen = false;
    this.questionIds = [];
    if (this.mode === 'question') this.mode = null;
    this.paint();
    if (this.edit) this.editor.focus({ preventScroll: true });
  }

  pickQuestion(q) {
    this.panelOpen = false;
    this.qcustom.value = '';
    if (this.mode === 'question' && q === this.currentQuestion()) {
      this.closePanel();
      return;
    }
    this.setQuestion(q);
    if (this.edit) this.editor.focus({ preventScroll: true });
  }

  setQuestion(q) {
    if (this.mode === 'question') {
      this.remember();
      this.questionIds.forEach(id => {
        const n = this.node(id);
        if (n && parentsOf(this.doc, id).length) n.q = q;
      });
      this.mode = null;
      this.questionIds = [];
      this.changed();
      return;
    }
    if (!this.edit) return;
    this.edit.q = q;
    this.render();
  }

  // ---------- Разбор: дебаты и жизненные решения ----------

  newWizard(stage, root, text) {
    const saved = ['life', 'study', 'debate'].includes(this.plugin.data.kind) ? this.plugin.data.kind : 'life';
    const kind = detectKind(text) || saved;
    return { stage, root, text, kind, type: detectType(kind, text), pos: '' };
  }

  startAnalysis() {
    let typed = '';
    if (this.edit) {
      const firstBlock = this.edit.kind === 'draft' && !this.edit.parents.length && !this.doc.nodes.length;
      if (firstBlock) {
        typed = this.editor.value.trim();
        this.closeEditor();
      } else {
        this.finishEdit();
      }
    }
    this.panelOpen = false;
    this.questionIds = [];
    this.marked.clear();
    if (this.doc.analysis && !analysisSteps(this.doc).length) delete this.doc.analysis;
    if (this.doc.analysis) {
      this.wiz = { stage: 'steps', key: this.doc.analysis.step };
    } else if (this.doc.nodes.length) {
      const up = this.sel ? [...walk(this.doc, [this.sel], parentsOf)] : this.doc.nodes.map(n => n.id);
      const root = up.find(id => !parentsOf(this.doc, id).length);
      this.wiz = this.newWizard('type', root, this.node(root).text);
    } else if (typed) {
      this.wiz = this.newWizard('type', null, typed);
    } else {
      this.wiz = this.newWizard('motion', null, '');
    }
    this.mode = 'wizard';
    this.wizInput.value = '';
    this.showStep();
    // После открытия файла Obsidian сам переводит фокус на вкладку, поэтому фокус ставится дважды.
    window.setTimeout(() => this.focusWizard(), 200);
  }

  focusWizard() {
    if (this.mode !== 'wizard') return;
    const { stage } = this.wiz;
    if (stage === 'motion' || stage === 'steps') this.wizInput.focus({ preventScroll: true });
  }

  currentStep() {
    const steps = analysisSteps(this.doc);
    const index = Math.max(0, steps.findIndex(s => s.key === this.wiz.key));
    return { steps, index, step: steps[index] };
  }

  showStep() {
    if (this.wiz.stage === 'steps') {
      const { step } = this.currentStep();
      this.wiz.key = step.key;
      this.doc.analysis.step = step.key;
      this.sel = step.parent;
    }
    this.render();
    if (this.wiz.stage === 'steps') this.focusOn(this.sel);
    this.focusWizard();
  }

  // Вкладки «Дебаты» и «Жизнь»: пока каркас не построен, вид разбора можно сменить.
  setKind(kind) {
    const w = this.wiz;
    if (!w || (w.stage !== 'motion' && w.stage !== 'type') || w.kind === kind) return;
    w.kind = kind;
    w.type = detectType(kind, w.stage === 'motion' ? this.wizInput.value : w.text);
    this.paint();
    this.focusWizard();
  }

  wizChoice(key, name, lead, on, onClick) {
    const b = el(this.wizTypes, 'button', `lt-wiz-type${on ? ' is-on' : ''}`);
    b.dataset.type = key;
    el(b, 'span', 'lt-wiz-type-name', name);
    el(b, 'span', 'lt-wiz-type-lead', lead);
    b.addEventListener('click', onClick);
  }

  renderWizard() {
    const w = this.wiz;
    const picking = w.stage === 'type' || w.stage === 'side';
    const kinds = w.stage === 'motion' || w.stage === 'type';
    let count = tr('Разбор');
    let added = '';
    let next = tr('Дальше');
    let side = '';
    let sideLabel = '';
    let chips = null;
    this.wizTypes.textContent = '';
    this.wizTypes.setCssProps({ 'display': picking ? '' : 'none' });
    this.wizInput.setCssProps({ 'display': picking ? 'none' : '' });
    this.wizAdd.setCssProps({ 'display': w.stage === 'steps' ? '' : 'none' });
    this.wizKinds.setCssProps({ 'display': kinds ? '' : 'none' });
    this.kindButtons.forEach(b => {
      const on = b.dataset.kind === w.kind;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    this.wizUndo.disabled = !this.history.length;
    if (w.stage === 'motion') {
      const [prompt, hint, placeholder] = {
        life: [tr('Какой вопрос решаешь?'), tr('Напиши его целиком. Например: Переводиться ли в другой вуз?'), tr('Стоит ли…')],
        study: [tr('Какую тему разбираешь?'), tr('Напиши её коротко. Например: Цикл Кребса.'), tr('Тема…')],
        debate: [tr('Какая резолюция?'), tr('Напиши её целиком. Например: ЭП сожалеет о романтизации материнства.'), tr('ЭП…')],
      }[w.kind];
      this.wizPrompt.textContent = tr(prompt);
      this.wizHint.textContent = tr(hint);
      this.wizInput.placeholder = tr(placeholder);
      this.wizBack.disabled = true;
    } else if (w.stage === 'type') {
      const life = w.kind === 'life';
      const types = life ? LIFE_TYPES : MOTION_TYPES;
      this.wizPrompt.textContent = life ? tr('Какое это решение?') : tr('Какой это тип резолюции?');
      this.wizHint.textContent = tr('Похоже на «{name}». Если это не так, нажми другой вариант.', { name: types[w.type].name });
      this.wizBack.disabled = Boolean(w.root);
      Object.entries(types).forEach(([key, t]) => this.wizChoice(key, t.name, t.lead, key === w.type, () => {
        w.type = key;
        this.commitType();
      }));
    } else if (w.stage === 'side') {
      this.wizPrompt.textContent = tr('Какая у тебя позиция?');
      this.wizHint.textContent = tr('Твоя сторона будет жёлтой, соперник синим. У второго стола появится расширение. Позицию можно сменить в любой момент.');
      this.wizBack.disabled = false;
      POSITION_CHOICES.forEach(([key, name, lead]) => this.wizChoice(key || 'none', name, lead, key === w.pos, () => {
        w.pos = key;
        this.commitSide();
      }));
    } else {
      const a = this.doc.analysis;
      const { steps, index, step } = this.currentStep();
      const answers = stepAnswers(this.doc, step).length;
      const debate = kindOf(a.type) === 'debate';
      count = tr('Шаг {n} из {total}', { n: index + 1, total: steps.length }) + (debate ? '' : ` · ${TYPES[a.type].name}`);
      if (debate) {
        const pos = posInfo(a.pos);
        // Без позиции надпись короткая: рядом таймер, и номер шага иначе не помещается на телефоне.
        side = pos ? pos[1] : a.me ? TEAM_NAME[a.me] : tr('Обе');
        sideLabel = pos ? pos[2] : a.me ? side : tr('обе стороны');
      }
      chips = step.chips || null;
      this.wizPrompt.textContent = step.prompt;
      this.wizHint.textContent = step.hint;
      this.wizInput.placeholder = answers ? tr('Добавлено: {n}. Ещё один?', { n: answers }) : tr('Ответ станет блоком');
      this.wizBack.disabled = index === 0;
      if (answers) added = tr('Добавлено: {n}', { n: answers });
      if (index === steps.length - 1) next = tr('Готово');
    }
    this.wizCount.textContent = count;
    this.wizAdded.textContent = added;
    this.wizNext.textContent = next;
    this.wizSide.setCssProps({ 'display': side ? '' : 'none' });
    this.wizSideName.textContent = side;
    this.wizSide.setAttribute('aria-label', tr('Твоя позиция: {side}. Сменить', { side: sideLabel }));
    this.wizChips.textContent = '';
    this.wizChips.setCssProps({ 'display': chips ? '' : 'none' });
    (chips || []).forEach(c => {
      const b = el(this.wizChips, 'button', 'lt-wiz-chip', c);
      b.type = 'button';
      b.addEventListener('click', () => this.useChip(c));
    });
    this.paintTimer();
  }

  // Критерий сравнения начинает ответ: «Масштаб: …», дальше дописываешь сам.
  useChip(chip) {
    const input = this.wizInput;
    // Заменяется только критерий, нажатый раньше, а свой текст с двоеточием остаётся.
    const prev = CRITERIA.find(c => input.value.startsWith(`${c}:`));
    const rest = prev ? input.value.slice(prev.length + 1).trimStart() : input.value;
    input.value = `${chip}: ${rest}`;
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  }

  // Таймер 15 минут подготовки: идёт с момента, когда собран каркас разбора дебатов.
  paintTimer() {
    if (!this.wizTimer) return;
    const a = this.doc && this.doc.analysis;
    const on = this.mode === 'wizard' && this.wiz && this.wiz.stage === 'steps' && a && a.t0 && kindOf(a.type) === 'debate';
    const status = on ? prepStatus(this.wiz.key, Date.now() - a.t0) : null;
    const behind = Boolean(status) && (status.late || status.over);
    this.wizTimer.setCssProps({ 'display': status ? '' : 'none' });
    this.wizPace.setCssProps({ 'display': behind ? '' : 'none' });
    if (!status) return;
    const text = `${Math.floor(status.left / 60)}:${String(status.left % 60).padStart(2, '0')}`;
    if (this.wizTimer.textContent !== text) this.wizTimer.textContent = text;
    this.wizTimer.classList.toggle('is-late', behind);
    const pace = status.over ? tr('Время подготовки вышло. План речи в меню ⋮.') : tr('Время идёт быстрее: {label}.', { label: status.label });
    if (this.wizPace.textContent !== pace) this.wizPace.textContent = pace;
  }

  // Кнопка «Добавить» и клавиша ввода.
  wizardSubmit() {
    const w = this.wiz;
    const text = this.wizInput.value.trim();
    if (w.stage === 'type') this.commitType();
    else if (w.stage === 'side') this.commitSide();
    else if (w.stage === 'motion') this.acceptMotion(text);
    else if (text) this.addAnswer(text);
    else this.wizardNext();
  }

  wizardNext() {
    const w = this.wiz;
    const text = this.wizInput.value.trim();
    if (w.stage === 'type') {
      this.commitType();
      return;
    }
    if (w.stage === 'side') {
      this.commitSide();
      return;
    }
    if (w.stage === 'motion') {
      this.acceptMotion(text);
      return;
    }
    if (text) this.addAnswer(text);
    const { steps, index } = this.currentStep();
    if (index >= steps.length - 1) {
      this.finishWizard();
      return;
    }
    w.key = steps[index + 1].key;
    this.scheduleSave();
    this.showStep();
  }

  wizardBack() {
    const w = this.wiz;
    if (w.stage === 'side') {
      if (w.change) this.wiz = { stage: 'steps', key: w.key };
      else w.stage = 'type';
      this.showStep();
      return;
    }
    if (w.stage === 'type' && !w.root) {
      w.stage = 'motion';
      this.wizInput.value = w.text;
      this.showStep();
      return;
    }
    if (w.stage !== 'steps') return;
    const { steps, index } = this.currentStep();
    if (!index) return;
    w.key = steps[index - 1].key;
    this.wizInput.value = '';
    this.scheduleSave();
    this.showStep();
  }

  acceptMotion(text) {
    if (!text) {
      this.focusWizard();
      return;
    }
    const kind = detectKind(text) || this.wiz.kind;
    Object.assign(this.wiz, { stage: 'type', text, kind, type: detectType(kind, text) });
    this.wizInput.value = '';
    this.wizInput.blur();
    // У темы один вид разбора: выбирать нечего, каркас строится сразу.
    if (kind === 'study') {
      this.buildAnalysis();
      return;
    }
    this.showStep();
  }

  // В дебатах после типа спрашиваем сторону, в жизненном решении каркас строится сразу.
  commitType() {
    const w = this.wiz;
    if (w.kind !== 'debate') {
      this.buildAnalysis();
      return;
    }
    w.stage = 'side';
    this.showStep();
  }

  commitSide() {
    const w = this.wiz;
    if (!w.change) {
      this.buildAnalysis();
      return;
    }
    if (!this.doc.analysis) {
      this.closeWizard();
      return;
    }
    // pos равен null, если в файле 2.3 выбрана сторона без позиции и новую позицию не нажали.
    const a = this.doc.analysis;
    if (w.pos !== null && ((a.pos || '') !== w.pos || (a.me || '') !== teamOf(w.pos))) {
      this.remember();
      setPosition(this.doc, w.pos);
      this.scheduleSave();
    }
    // Шаги зависят от стороны: если прежнего шага больше нет, начинаем с аргументов.
    const steps = analysisSteps(this.doc);
    const key = steps.some(s => s.key === w.key) ? w.key : (steps.find(s => s.key === 'gov') || steps[0]).key;
    this.wiz = { stage: 'steps', key };
    this.showStep();
  }

  openSide() {
    if (!this.wiz || this.wiz.stage !== 'steps') return;
    const a = this.doc.analysis;
    this.wiz = { stage: 'side', change: true, key: this.wiz.key, pos: a.pos || (a.me ? null : '') };
    this.wizInput.value = '';
    this.wizInput.blur();
    this.showStep();
  }

  buildAnalysis() {
    const w = this.wiz;
    this.remember();
    const root = w.root || addBlock(this.doc, { parents: [], text: w.text, q: '' });
    buildSkeleton(this.doc, root, w.type, w.pos);
    if (w.kind === 'debate') this.doc.analysis.t0 = Date.now();
    this.plugin.data.kind = w.kind;
    this.plugin.savePrefs();
    this.markTip('start');
    this.wiz = { stage: 'steps', key: this.doc.analysis.step };
    this.scheduleSave();
    this.showStep();
  }

  addAnswer(text) {
    const { step } = this.currentStep();
    const parent = this.node(step.parent);
    this.remember();
    if (parent.collapsed) delete parent.collapsed;
    const id = addBlock(this.doc, { parents: [step.parent], text, q: step.q, side: step.side === undefined ? parent.side || '' : step.side });
    this.wizInput.value = '';
    this.sel = step.parent;
    this.render();
    this.scheduleSave();
    this.reveal(id);
  }

  closeWizard() {
    const w = this.wiz;
    // Резолюция, набранная для разбора, не теряется, даже если разбор закрыли на полпути.
    const typed = w && !w.root && w.stage !== 'steps' && !w.change && !this.doc.nodes.length
      ? (w.stage === 'motion' ? this.wizInput.value.trim() : w.text)
      : '';
    this.mode = null;
    this.wiz = null;
    this.wizInput.blur();
    if (!typed) {
      this.paint();
      return;
    }
    this.remember();
    this.sel = addBlock(this.doc, { parents: [], text: typed, q: '' });
    this.scheduleSave();
    this.render();
  }

  finishWizard() {
    const debate = kindOf(this.doc.analysis.type) === 'debate';
    this.sel = null;
    this.closeWizard();
    this.fit(true);
    new Notice(debate
      ? tr('Разбор собран. План речи открывается в меню ⋮ вверху.')
      : tr('Разбор собран. Любой блок можно развить плюсом под ним.'));
  }

  // Заметка с планом речи рядом с деревом. Собирается заново при каждом вызове.
  async openSpeechPlan() {
    if (this.edit) this.finishEdit();
    if (this.broken !== null || !this.file) return;
    const a = this.doc.analysis;
    if (!a || kindOf(a.type) !== 'debate') {
      new Notice(tr('План речи собирается из разбора резолюции. Начни «Разбор» в меню ⋮.'));
      return;
    }
    try {
      const path = planPathFor(this.file.path);
      const text = speechPlan(this.doc, this.file.basename);
      const { vault } = this.app;
      let file = vault.getAbstractFileByPath(path);
      if (file) await vault.process(file, () => text);
      else file = await vault.create(path, text);
      await this.app.workspace.getLeaf(true).openFile(file, { state: { mode: 'preview' } });
    } catch (e) {
      console.error(tr('Logic Tree: план речи'), e);
      new Notice(tr('Не получилось собрать план речи.'));
    }
  }

  openCustom() {
    this.customOpen = true;
    this.custom.value = '';
    this.paint();
    this.custom.focus({ preventScroll: true });
  }

  applyCustom() {
    if (!this.customOpen) return;
    const q = this.custom.value.trim();
    this.customOpen = false;
    this.custom.value = '';
    if (q) this.setQuestion(q);
    else this.paint();
    if (this.edit) this.editor.focus({ preventScroll: true });
  }

  // ---------- Действия с блоками ----------

  select(id) {
    this.sel = id;
    this.paint();
    if (id) this.reveal(id);
  }

  setMode(mode) {
    this.mode = mode;
    if (!mode) this.marked.clear();
    this.paint();
  }

  // Для сведения и связи нужно видеть все блоки сразу.
  startMerge() {
    this.marked = new Set([this.sel]);
    this.setMode('merge');
    this.fit(true);
  }

  startLink() {
    this.setMode('link');
    this.fit(true);
  }

  finishMerge() {
    if (this.marked.size < 2) return;
    const parents = [...this.marked];
    const first = this.node(parents[0]);
    this.beginDraft({ parents, q: this.suggest(parents[0]), side: first && first.side === 'o' ? 'o' : '' });
  }

  toggleSide() {
    const n = this.node(this.sel);
    if (!n) return;
    this.remember();
    setSide(this.doc, n.id, n.side === 'o' ? '' : 'o');
    this.changed();
  }

  toggleFold(id) {
    const n = this.node(id);
    if (!n) return;
    this.remember();
    if (n.collapsed) delete n.collapsed;
    else n.collapsed = true;
    this.changed();
  }

  toggleFocus() {
    this.plugin.data.focus = !this.plugin.data.focus;
    this.plugin.savePrefs();
    this.paint();
  }

  showHelp() {
    this.help.setCssProps({ 'display': '' });
  }

  showMenu(e) {
    const id = this.sel;
    if (!this.node(id)) return;
    const menu = new Menu();
    const add = (title, icon, fn, warning) => menu.addItem(item => {
      item.setTitle(title).setIcon(icon).onClick(fn);
      if (warning && item.setWarning) item.setWarning(true);
    });
    add(tr('Изменить текст'), 'pencil', () => this.startEditNode(id));
    if (parentsOf(this.doc, id).length) add(tr('Вопрос на стрелке'), 'help-circle', () => this.startQuestion([id]));
    // Меню на телефоне выезжает снизу и не должно прятать удаление за край экрана,
    // поэтому сюда попадает только то действие, которому не хватило места в нижней панели.
    const n = this.node(id);
    if (!n.h && n.side === 'o') add(tr('Связать стрелкой'), 'link', () => this.startLink());
    else if (!n.h) add(tr('Ответить на блок'), 'reply', () => this.reply());
    add(tr('Вся схема'), 'maximize', () => this.fit(true));
    add(tr('Фокус на ветке'), 'focus', () => this.toggleFocus());
    add(tr('Разбор'), 'list-checks', () => this.startAnalysis());
    add(tr('Экспорт в PDF'), 'file-down', () => this.exportPdf());
    menu.addSeparator();
    add(tr('Удалить блок'), 'trash', () => this.removeSelected(), true);
    if (childrenOf(this.doc, id).length) add(tr('Удалить ветку'), 'trash-2', () => this.removeSelectedBranch(), true);
    menu.showAtMouseEvent(e);
  }

  removeSelected() {
    const id = this.sel;
    if (!id) return;
    this.remember();
    this.sel = removeBlock(this.doc, id);
    this.anchor = this.sel;
    this.changed();
  }

  removeSelectedBranch() {
    const id = this.sel;
    if (!id) return;
    this.remember();
    const { next, removed } = removeBranch(this.doc, id);
    this.sel = next;
    this.anchor = next;
    this.changed();
    new Notice(tr('Удалено блоков: {n}. Кнопка «Назад» вернёт их.', { n: removed }));
  }

  toggleLink(target) {
    const from = this.sel;
    this.mode = null;
    if (target === from) {
      this.paint();
      return;
    }
    if (hasEdge(this.doc, from, target)) {
      this.remember();
      this.doc.edges = this.doc.edges.filter(e => !(e[0] === from && e[1] === target));
    } else if (reaches(this.doc, target, from)) {
      new Notice(tr('Такая стрелка замкнёт схему в круг, поэтому её нельзя провести'));
      this.paint();
      return;
    } else {
      this.remember();
      this.doc.edges.push([from, target]);
    }
    this.changed();
  }

  // ---------- Перенос блока ----------

  startDrag(id, x, y) {
    const box = this.boxes.get(id);
    const n = this.node(id);
    if (!box || !n) return;
    this.drag = { id, target: null, zone: null };
    this.sel = id;
    box.classList.add('is-dragging');
    this.ghost.textContent = n.text;
    this.ghost.classList.toggle('lt-opp', n.side === 'o');
    this.ghost.addClass('is-shown');
    this.paint();
    if (navigator.vibrate) navigator.vibrate(12);
    this.moveDrag(x, y);
  }

  clearDropMarks() {
    this.boxes.forEach(b => b.classList.remove('is-drop-child', 'is-drop-before', 'is-drop-after'));
  }

  moveDrag(x, y) {
    const rect = this.viewport.getBoundingClientRect();
    this.ghost.setCssProps({ 'left': `${x - rect.left}px` });
    this.ghost.setCssProps({ 'top': `${y - rect.top - 36}px` });
    this.clearDropMarks();
    this.drag.target = null;
    const under = activeDocument.elementFromPoint(x, y);
    const hit = under && under.closest ? under.closest('.lt-node') : null;
    if (!hit || hit.dataset.id === this.drag.id) return;
    const r = hit.getBoundingClientRect();
    const rel = (x - r.left) / r.width;
    const zone = rel < 0.28 ? 'before' : rel > 0.72 ? 'after' : 'child';
    if (!canMove(this.doc, this.drag.id, hit.dataset.id, zone)) return;
    this.drag.target = hit.dataset.id;
    this.drag.zone = zone;
    hit.classList.add(`is-drop-${zone}`);
  }

  endDrag(commit) {
    const { id, target, zone } = this.drag;
    this.drag = null;
    this.clearDropMarks();
    this.ghost.removeClass('is-shown');
    const box = this.boxes.get(id);
    if (box) box.classList.remove('is-dragging');
    if (commit && target) {
      this.remember();
      moveBlock(this.doc, id, target, zone);
      this.markTip('select');
      this.changed();
      return;
    }
    this.paint();
  }

  // ---------- Экспорт в PDF ----------

  onPaneMenu(menu, source) {
    super.onPaneMenu(menu, source);
    if (this.broken !== null) return;
    // Раздел «action» стоит в начале меню: на телефоне оно длинное, и пункты внизу не видны без прокрутки.
    const add = (title, icon, fn) => menu.addItem(item => item.setTitle(title).setIcon(icon).setSection('action').onClick(fn));
    add(tr('План речи'), 'scroll-text', () => this.openSpeechPlan());
    add(tr('Экспорт в PDF'), 'file-down', () => this.exportPdf());
    add(tr('Разбор'), 'list-checks', () => this.startAnalysis());
    add(tr('Как пользоваться'), 'info', () => this.showHelp());
  }

  // Рисует всё дерево целиком, вместе со свёрнутыми ветками, своей раскладкой: от экрана она не зависит.
  drawExport() {
    const family = getComputedStyle(this.contentEl).fontFamily || 'sans-serif';
    const font = size => `700 ${size}px ${family}`;
    const probe = activeDocument.createElement('canvas').getContext('2d');
    const wrap = (text, size, width) => {
      probe.font = font(size);
      return wrapText(text.toUpperCase(), width, s => probe.measureText(s).width);
    };
    const measure = (word, size) => {
      probe.font = font(size);
      return probe.measureText(word.toUpperCase()).width;
    };
    const blocks = new Map();
    const heights = {};
    const widths = {};
    const hasParent = new Set(this.doc.edges.map(e => e[1]));
    this.doc.nodes.forEach(n => {
      const width = blockWidth(n.text, !hasParent.has(n.id));
      const size = pickSize(n.text, width - TEXT_INSET, measure);
      const lines = wrap(n.text, size, width - BLOCK_PAD_X * 2);
      blocks.set(n.id, { lines, size });
      widths[n.id] = width;
      heights[n.id] = Math.max(MIN_BLOCK_H, Math.ceil(lines.length * size * 1.25 + BLOCK_PAD_Y));
    });
    const g = layout(this.doc.nodes, this.doc.edges, heights, widths);
    const width = Math.max(g.width, 260);
    const height = g.height + EXPORT_TOP;
    const scale = exportScale(width, height, Platform.isMobile ? 8e6 : 2e7);
    const canvas = activeDocument.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(canvas.width / width, canvas.height / height);
    ctx.fillStyle = PAPER.bg;
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PAPER.text;
    ctx.font = font(17);
    ctx.fillText(wrapText(this.file.basename, width - MARGIN * 2, s => ctx.measureText(s).width)[0], MARGIN, EXPORT_TOP / 2 + 6);
    ctx.translate((width - g.width) / 2, EXPORT_TOP);

    const opp = id => this.node(id).side === 'o';
    ctx.lineWidth = 3;
    ctx.lineCap = 'square';
    g.paths.forEach(p => {
      ctx.strokeStyle = opp(p.to) ? PAPER.blueLine : PAPER.yellowLine;
      ctx.beginPath();
      p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    });
    g.arrows.forEach(a => {
      ctx.fillStyle = opp(a.to) ? PAPER.blueLine : PAPER.yellowLine;
      ctx.beginPath();
      ctx.moveTo(a.x - 7, a.y - 10);
      ctx.lineTo(a.x + 7, a.y - 10);
      ctx.lineTo(a.x, a.y);
      ctx.fill();
    });

    ctx.textAlign = 'center';
    g.labels.forEach(l => {
      const lines = wrap(l.text, 11.5, (l.place === 'child' ? 158 : 190) - 12);
      ctx.font = font(11.5);
      const w = Math.max(...lines.map(s => ctx.measureText(s).width)) + 12;
      const h = lines.length * 13.8 + 4;
      ctx.fillStyle = PAPER.bg;
      ctx.fillRect(l.x - w / 2, l.y - h / 2, w, h);
      ctx.fillStyle = PAPER.text;
      lines.forEach((s, i) => ctx.fillText(s, l.x, l.y - h / 2 + 2 + 13.8 * (i + 0.5)));
    });

    ctx.textAlign = 'left';
    ctx.lineWidth = 1.5;
    this.doc.nodes.forEach(n => {
      const { x, y, h, w } = g.pos[n.id];
      const { lines, size } = blocks.get(n.id);
      const side = n.side === 'o';
      ctx.fillStyle = n.h ? PAPER.ink : side ? PAPER.blue : PAPER.yellow;
      ctx.fillRect(x, y, w, h);
      if (n.h || side) {
        ctx.strokeStyle = n.h ? (side ? PAPER.blueLine : PAPER.yellowLine) : PAPER.blueEdge;
        ctx.setLineDash(side ? [4, 3] : []);
        ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
        ctx.setLineDash([]);
      }
      ctx.fillStyle = n.h ? (side ? PAPER.blue : PAPER.yellow) : PAPER.ink;
      ctx.font = font(size);
      const lineH = size * 1.25;
      const top = y + (h - lines.length * lineH) / 2;
      lines.forEach((s, i) => ctx.fillText(s, x + BLOCK_PAD_X, top + lineH * (i + 0.5)));
    });
    return { canvas, width, height };
  }

  async exportPdf() {
    if (this.edit) this.finishEdit();
    if (this.broken !== null || !this.file) return;
    if (!this.doc.nodes.length) {
      new Notice(tr('В схеме пока нет блоков, сохранять нечего'));
      return;
    }
    try {
      const { canvas, width, height } = this.drawExport();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('canvas');
      const pdf = buildPdf({
        jpeg: new Uint8Array(await blob.arrayBuffer()),
        imgW: canvas.width,
        imgH: canvas.height,
        pageW: width * 0.75,
        pageH: height * 0.75,
        title: this.file.basename,
      });
      const path = pdfPathFor(this.file.path);
      const { vault } = this.app;
      let file = vault.getAbstractFileByPath(path);
      if (file) await vault.modifyBinary(file, pdf.buffer);
      else file = await vault.createBinary(path, pdf.buffer);
      new Notice(tr('PDF сохранён рядом со схемой: {name}', { name: file.name }));
      await this.app.workspace.getLeaf(true).openFile(file);
    } catch (e) {
      console.error(tr('Logic Tree: экспорт в PDF'), e);
      new Notice(tr('Не получилось сохранить PDF. Если схема очень большая, попробуй экспорт на компьютере.'));
    }
  }

  // ---------- Нажатия ----------

  onTap(target) {
    if (!target.closest) return;
    const count = target.closest('.lt-count');
    const label = target.closest('.lt-label');
    const box = target.closest('.lt-node');
    const id = box ? box.dataset.id : null;

    if (this.mode === 'merge') {
      if (!id) return;
      if (this.marked.has(id)) this.marked.delete(id);
      else this.marked.add(id);
      this.paint();
      return;
    }
    if (this.mode === 'link') {
      if (id) this.toggleLink(id);
      else this.setMode(null);
      return;
    }
    if (this.mode === 'wizard') return;
    if (this.mode === 'question') {
      this.closePanel();
      return;
    }
    // Нажатие мимо во время ввода сохраняет написанное и ничего не разрывает.
    if (this.edit) {
      this.panelOpen = false;
      this.finishEdit();
      this.editor.blur();
      if (id) this.select(id);
      return;
    }
    if (count) {
      this.sel = id;
      this.toggleFold(id);
      return;
    }
    if (label) {
      const ids = label.dataset.ids.split(',').filter(x => x !== DRAFT);
      if (ids.length) this.startQuestion(ids);
      return;
    }
    if (id && id === this.sel) {
      this.startEditNode(id);
      return;
    }
    this.select(id);
  }
}

// ---------- Вкладка тренажёра ----------

const TRAIN_VIEW = 'logic-tree-trainer';
const NOTE_DELAY_MS = 1200;

class TrainerView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.tab = 0;
    this.draft = null;
    this.noteTimer = null;
    this.part = -1;
    this.refs = {};
  }

  getViewType() { return TRAIN_VIEW; }
  getDisplayText() { return tr('Тренировка'); }
  getIcon() { return 'timer'; }

  get t() { return this.plugin.data.training; }

  // Где сейчас тренировка: выбор резолюции, подготовка, речь или итог.
  stage() {
    const t = this.t;
    if (!t) return 'start';
    if (!t.p1) return 'prep';
    if (!t.s1) return 'speak';
    return 'done';
  }

  async onOpen() {
    this.root = this.contentEl;
    this.root.classList.add('lt-root', 'lt-train');
    this.registerInterval(window.setInterval(() => this.tick(), 1000));
    if (this.t && !this.t.p1) this.tab = trainPace(0, Date.now() - this.t.t0).due;
    if (!this.t) await this.newDraft();
    this.render();
  }

  async onClose() {
    await this.flushNote();
  }

  onPaneMenu(menu, source) {
    super.onPaneMenu(menu, source);
    const add = (title, icon, fn) => menu.addItem(item => item.setTitle(title).setIcon(icon).setSection('action').onClick(fn));
    if (this.t && this.t.path) add(tr('Открыть заметку'), 'file-text', () => this.openNote());
    if (this.t) add(tr('Новая тренировка'), 'rotate-ccw', () => this.restart());
  }

  // Свои резолюции из заметки «Резолюции» и встроенный список.
  async motions() {
    const own = [];
    for (const name of new Set([tr('Резолюции'), tr('Резолюции'), 'Motions'])) {
      const file = this.app.metadataCache.getFirstLinkpathDest(name, '');
      if (!file) continue;
      try {
        own.push(...motionBank(await this.app.vault.cachedRead(file)));
      } catch { /* заметку не прочитать: хватит встроенных */ }
    }
    return [...new Set([...own, ...TRAIN_MOTIONS])];
  }

  async newDraft() {
    const recent = this.plugin.data.recentMotions || [];
    const list = await this.motions();
    this.draft = {
      motion: pickMotion(list, recent),
      pos: POSITIONS[Math.floor(Math.random() * POSITIONS.length)][0],
      list,
    };
  }

  async restart() {
    await this.flushNote();
    this.plugin.data.training = null;
    this.plugin.savePrefs();
    this.tab = 0;
    await this.newDraft();
    this.render();
  }

  begin() {
    const motion = this.draft.motion.trim();
    if (!motion) {
      new Notice(tr('Напиши резолюцию или нажми «Другая».'));
      return;
    }
    const data = this.plugin.data;
    data.recentMotions = [motion, ...(data.recentMotions || []).filter(m => m !== motion)].slice(0, 15);
    data.training = { motion, pos: this.draft.pos, t0: Date.now(), p1: null, s0: null, s1: null, f: {}, path: null };
    this.tab = 0;
    this.changed(true);
    this.render();
  }

  // Любая правка: запомнить тренировку в настройках плагина и обновить заметку.
  changed(now) {
    this.plugin.data.training = this.t;
    this.plugin.savePrefs();
    window.clearTimeout(this.noteTimer);
    if (now) this.writeNote();
    else this.noteTimer = window.setTimeout(() => this.writeNote(), NOTE_DELAY_MS);
  }

  async flushNote() {
    if (!this.noteTimer) return;
    window.clearTimeout(this.noteTimer);
    await this.writeNote();
  }

  // Записи идут по очереди: иначе две подряд могут обе попытаться создать файл.
  writeNote() {
    this.noteTimer = null;
    this.writing = (this.writing || Promise.resolve()).then(() => this.saveNote());
    return this.writing;
  }

  async saveNote() {
    const t = this.t;
    if (!t) return;
    const vault = this.app.vault;
    try {
      if (!t.path) {
        t.path = trainingPath(new Date(t.t0), p => Boolean(vault.getAbstractFileByPath(p)));
        this.plugin.savePrefs();
      }
      const text = trainingNote(t);
      const file = vault.getAbstractFileByPath(t.path);
      if (file) {
        await vault.process(file, () => text);
        return;
      }
      if (!vault.getAbstractFileByPath(TRAIN_FOLDER)) await vault.createFolder(TRAIN_FOLDER);
      await vault.create(t.path, text);
    } catch (e) {
      console.error(tr('Logic Tree: заметка тренировки'), e);
      if (!this.noteFailed) new Notice(tr('Не получилось сохранить заметку тренировки. Записи остаются в тренажёре.'));
      this.noteFailed = true;
    }
  }

  async openNote() {
    await this.flushNote();
    const file = this.t && this.t.path && this.app.vault.getAbstractFileByPath(this.t.path);
    if (!file) {
      new Notice(tr('Заметка тренировки ещё не создана.'));
      return;
    }
    await this.app.workspace.getLeaf(true).openFile(file, { state: { mode: 'preview' } });
  }

  // ---------- Отрисовка ----------

  render() {
    this.root.textContent = '';
    this.refs = {};
    this.part = -1;
    const stage = this.stage();
    this.root.dataset.stage = stage;
    if (stage === 'start') this.renderStart();
    else if (stage === 'prep') this.renderPrep();
    else if (stage === 'speak') this.renderSpeak();
    else this.renderDone();
    this.tick();
  }

  renderStart() {
    const d = this.draft;
    const scroll = el(this.root, 'div', 'lt-tr-scroll');
    el(scroll, 'div', 'lt-tr-title', tr('Тренировка'));
    el(scroll, 'div', 'lt-tr-lead', tr('15 минут подготовки и 7 минут речи, как на турнире. Всё сохранится заметкой в папке «Тренировки».'));

    el(scroll, 'div', 'lt-tr-label', tr('Резолюция'));
    const motion = el(scroll, 'textarea', 'lt-tr-field lt-tr-motion');
    motion.value = d.motion;
    motion.rows = 2;
    motion.setAttribute('aria-label', tr('Резолюция'));
    motion.addEventListener('input', () => {
      d.motion = motion.value;
      this.grow(motion);
    });
    const again = button(scroll, 'lt-btn lt-tr-again', tr('Другая резолюция'), () => {
      d.motion = pickMotion(d.list.filter(m => m !== d.motion), this.plugin.data.recentMotions || []) || d.motion;
      motion.value = d.motion;
      this.grow(motion);
    });
    again.prepend(this.iconSpan('dices'));
    el(scroll, 'div', 'lt-tr-note', tr('Свои резолюции: создай заметку «Резолюции» и пиши по одной в строке.'));

    el(scroll, 'div', 'lt-tr-label', tr('Позиция'));
    const grid = el(scroll, 'div', 'lt-tr-pos');
    POSITIONS.forEach(([key, short, name]) => {
      const b = button(grid, 'lt-tr-posbtn', '', () => {
        d.pos = key;
        grid.querySelectorAll('.lt-tr-posbtn').forEach(x => x.classList.toggle('is-on', x === b));
      });
      b.dataset.pos = key;
      b.classList.toggle('is-on', d.pos === key);
      el(b, 'span', 'lt-tr-posshort', short);
      el(b, 'span', 'lt-tr-posname', name);
    });

    const foot = el(this.root, 'div', 'lt-tr-foot');
    button(foot, 'lt-btn lt-primary lt-tr-go', tr('Начать: 15 минут подготовки'), () => this.begin());
    window.requestAnimationFrame(() => this.grow(motion));
  }

  renderHead(withTabs) {
    const t = this.t;
    const head = el(this.root, 'div', 'lt-tr-head');
    const top = el(head, 'div', 'lt-tr-top');
    this.refs.clock = el(top, 'div', 'lt-tr-clock');
    this.refs.clock.setAttribute('role', 'timer');
    const info = el(top, 'div', 'lt-tr-info');
    el(info, 'div', 'lt-tr-motion-line', t.motion);
    const pos = posInfo(t.pos);
    el(info, 'div', 'lt-tr-sub', pos ? `${pos[1]}, ${pos[2]}` : '');
    if (!withTabs) return head;
    const tabs = el(head, 'div', 'lt-tr-tabs');
    tabs.setAttribute('role', 'tablist');
    this.refs.tabs = TRAIN_TABS.map((tab, i) => {
      const b = button(tabs, 'lt-tr-tab', '', () => this.goTab(i));
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === this.tab));
      b.classList.toggle('is-on', i === this.tab);
      el(b, 'span', 'lt-tr-tabspan', tab.span);
      el(b, 'span', 'lt-tr-tabname', tab.title);
      return b;
    });
    this.refs.pace = el(head, 'button', 'lt-tr-pace');
    this.refs.pace.addEventListener('click', () => {
      const pace = trainPace(this.tab, Date.now() - this.t.t0);
      if (pace && pace.over) this.toSpeak();
      else if (pace) this.goTab(pace.due);
    });
    return head;
  }

  goTab(i) {
    this.tab = i;
    this.render();
    if (this.refs.scroll) this.refs.scroll.scrollTop = 0;
  }

  renderPrep() {
    this.renderHead(true);
    const scroll = el(this.root, 'div', 'lt-tr-scroll');
    this.refs.scroll = scroll;
    const tab = TRAIN_TABS[this.tab];
    if (tab.key === 'sheet') this.renderSheet(scroll);
    else TRAIN_FIELDS[tab.key].forEach(([key, label, hint]) => this.field(scroll, key, label, hint));
    const next = this.tab < TRAIN_TABS.length - 1
      ? button(scroll, 'lt-btn lt-primary lt-tr-next', tr('Дальше: {title}', { title: TRAIN_TABS[this.tab + 1].title }), () => this.goTab(this.tab + 1))
      : button(scroll, 'lt-btn lt-primary lt-tr-next', tr('Перейти к речи'), () => this.toSpeak());
    next.dataset.tab = String(this.tab);
  }

  renderSheet(scroll) {
    const ideas = ideaLines(this.t.f.ours);
    sheetParts(this.t.pos).forEach(p => {
      const card = el(scroll, 'section', 'lt-tr-part');
      card.dataset.part = p.key;
      const head = el(card, 'div', 'lt-tr-parthead');
      el(head, 'span', 'lt-tr-mark', clock(p.at));
      el(head, 'span', 'lt-tr-parttitle', p.title);
      el(card, 'div', 'lt-tr-hint', p.hint);
      if (!p.arg) {
        this.field(card, p.key, '', '', p.title);
        return;
      }
      ARG_FIELDS.forEach(([k, label, hint]) => {
        const key = `${p.key}.${k}`;
        const area = this.field(card, key, label, hint);
        if (k === 'thesis' && ideas.length) this.chips(card, ideas, idea => this.setField(key, area, idea), tr('Взять из идей'), key);
        if (k === 'weigh') this.chips(card, CRITERIA, c => this.setField(key, area, this.withCriterion(area.value, c)), tr('Критерий'), key);
      });
    });
  }

  // Поле ввода: растёт по тексту, каждая правка сразу запоминается.
  field(parent, key, label, hint, aria) {
    const wrap = el(parent, 'label', 'lt-tr-fieldwrap');
    if (label) el(wrap, 'span', 'lt-tr-label', label);
    const area = el(wrap, 'textarea', 'lt-tr-field');
    area.dataset.key = key;
    area.rows = 1;
    area.value = this.t.f[key] || '';
    if (hint) area.placeholder = hint;
    if (aria) area.setAttribute('aria-label', aria);
    area.addEventListener('input', () => {
      this.t.f[key] = area.value;
      this.grow(area);
      this.changed();
    });
    window.requestAnimationFrame(() => this.grow(area));
    return area;
  }

  chips(parent, items, onPick, label, key) {
    const row = el(parent, 'div', 'lt-tr-chips');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', label);
    row.dataset.for = key;
    items.forEach(text => {
      const b = button(row, 'lt-tr-chip', text, () => onPick(text));
      b.title = text;
    });
  }

  withCriterion(value, chip) {
    const prev = CRITERIA.find(c => value.startsWith(`${c}:`));
    const rest = prev ? value.slice(prev.length + 1).trimStart() : value;
    return `${chip}: ${rest}`;
  }

  setField(key, area, value) {
    area.value = value;
    this.t.f[key] = value;
    this.grow(area);
    this.changed();
    area.focus({ preventScroll: true });
    area.setSelectionRange(value.length, value.length);
  }

  grow(area) {
    area.setCssProps({ 'height': '' });
    area.setCssProps({ 'height': `${area.scrollHeight + 2}px` });
  }

  toSpeak() {
    this.t.p1 = Date.now();
    this.changed(true);
    this.render();
  }

  renderSpeak() {
    const t = this.t;
    const head = this.renderHead(false);
    const bar = el(head, 'div', 'lt-tr-speakbar');
    this.refs.now = el(bar, 'div', 'lt-tr-now');
    if (t.s0) {
      button(bar, 'lt-btn lt-primary lt-tr-stop', tr('Закончить речь'), () => this.stopSpeech());
    } else {
      button(bar, 'lt-btn lt-primary lt-tr-start', tr('Начать речь: 7 минут'), () => {
        t.s0 = Date.now();
        this.changed(true);
        this.render();
      });
    }
    const scroll = el(this.root, 'div', 'lt-tr-scroll lt-tr-say');
    this.refs.scroll = scroll;
    const val = k => String(t.f[k] || '').trim();
    this.refs.parts = sheetParts(t.pos).map(p => {
      const card = el(scroll, 'section', 'lt-tr-saypart');
      card.dataset.part = p.key;
      const top = el(card, 'div', 'lt-tr-parthead');
      el(top, 'span', 'lt-tr-mark', clock(p.at));
      el(top, 'span', 'lt-tr-parttitle', p.title);
      if (p.arg) {
        el(card, 'div', 'lt-tr-thesis', val(`${p.key}.thesis`) || tr('Тезис не записан'));
        ARG_FIELDS.slice(1).forEach(([k, label]) => {
          const v = val(`${p.key}.${k}`);
          if (!v) return;
          const row = el(card, 'div', 'lt-tr-row');
          el(row, 'span', 'lt-tr-rowlabel', label);
          el(row, 'span', 'lt-tr-rowtext', ideaLines(v).join(' · '));
        });
      } else if (p.key === 'answer') {
        const items = ideaLines(val('answer'));
        if (!items.length) el(card, 'div', 'lt-tr-empty', tr('Пусто'));
        items.forEach(line => el(card, 'div', 'lt-tr-line', line));
      } else {
        el(card, 'div', val(p.key) ? 'lt-tr-line' : 'lt-tr-empty', val(p.key) || tr('Пусто'));
      }
      return card;
    });
    if (!t.s0) {
      button(scroll, 'lt-btn lt-tr-back', tr('Назад к подготовке'), () => {
        t.p1 = null;
        this.tab = TRAIN_TABS.length - 1;
        this.changed(true);
        this.render();
      });
    }
  }

  stopSpeech() {
    this.t.s1 = Date.now();
    this.changed(true);
    this.render();
  }

  renderDone() {
    const t = this.t;
    const scroll = el(this.root, 'div', 'lt-tr-scroll');
    el(scroll, 'div', 'lt-tr-title', tr('Тренировка закончена'));
    el(scroll, 'div', 'lt-tr-lead', t.motion);
    const stats = el(scroll, 'div', 'lt-tr-stats');
    const stat = (label, from, to, limit) => {
      const row = el(stats, 'div', 'lt-tr-stat');
      el(row, 'span', 'lt-tr-statlabel', label);
      const v = el(row, 'span', 'lt-tr-statvalue', spentText(from, to, limit));
      if (to - from > limit) {
        v.classList.add('is-late');
        el(row, 'span', 'lt-tr-statnote', tr('дольше на {time}', { time: clock(Math.round((to - from - limit) / 1000)) }));
      }
    };
    stat(tr('Подготовка'), t.t0, t.p1, PREP_MS);
    stat(tr('Речь'), t.s0, t.s1, SPEECH_MS);
    const missing = missingFields(t);
    el(scroll, 'div', 'lt-tr-label', missing.length ? tr('Осталось пустым') : tr('Лист речи'));
    if (missing.length) {
      const list = el(scroll, 'ul', 'lt-tr-missing');
      missing.forEach(m => el(list, 'li', '', m));
    } else {
      el(scroll, 'div', 'lt-tr-note', tr('Все главные звенья заполнены.'));
    }
    const foot = el(this.root, 'div', 'lt-tr-foot');
    button(foot, 'lt-btn lt-tr-open', tr('Открыть заметку'), () => this.openNote());
    button(foot, 'lt-btn lt-primary lt-tr-new', tr('Новая тренировка'), () => this.restart());
  }

  iconSpan(name) {
    const span = el(null, 'span', 'lt-tr-icon');
    setIcon(span, name);
    return span;
  }

  // Раз в секунду: часы, подсказка о темпе и текущая часть речи. Поля не перерисовываются.
  tick() {
    const t = this.t;
    const r = this.refs;
    if (!t || !r.clock) return;
    const stage = this.stage();
    if (stage === 'prep') {
      const pace = trainPace(this.tab, Date.now() - t.t0);
      if (!pace) return;
      this.paint(r.clock, clock(pace.left), pace.late || pace.over);
      r.clock.setAttribute('aria-label', tr('Осталось {time} из 15 минут', { time: clock(pace.left) }));
      this.paint(r.pace, pace.text, false);
      r.pace.setCssProps({ 'display': pace.text ? '' : 'none' });
      r.tabs.forEach((b, i) => b.classList.toggle('is-due', i === pace.due && i !== this.tab));
      return;
    }
    if (stage !== 'speak') return;
    const elapsed = t.s0 ? Date.now() - t.s0 : 0;
    const over = elapsed > SPEECH_MS;
    this.paint(r.clock, t.s0 ? clock(Math.floor(elapsed / 1000)) : clock(SPEECH_MS / 1000), over);
    const part = speakPart(elapsed);
    const parts = sheetParts(t.pos);
    const now = !t.s0 ? tr('Лист речи. Встань и нажми, когда начнёшь говорить.') : over ? tr('Время вышло: заканчивай фразу.') : tr('Сейчас: {part}', { part: parts[part].title });
    this.paint(r.now, now, over);
    if (part === this.part || !t.s0) return;
    this.part = part;
    r.parts.forEach((card, i) => card.classList.toggle('is-now', i === part));
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    r.parts[part].scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
  }

  paint(node, text, late) {
    if (node.textContent !== text) node.textContent = text;
    node.classList.toggle('is-late', late);
  }
}

class LogicTreeSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName(tr('Язык'))
      .setDesc(tr('Язык интерфейса плагина. Действует на вкладки, открытые после смены.'))
      .addDropdown(d => d
        .addOption('auto', tr('Как в Obsidian'))
        .addOption('en', 'English')
        .addOption('ru', 'Русский')
        .setValue(this.plugin.data.language || 'auto')
        .onChange(value => {
          this.plugin.data.language = value;
          this.plugin.savePrefs();
          this.plugin.applyLanguage();
          this.display();
        }));
  }
}

class LogicTreePlugin extends obsidian.Plugin {
  async onload() {
    this.data = { focus: true, stats: {}, tips: {}, ...(await this.loadData()) };
    this.applyLanguage();
    this.addSettingTab(new LogicTreeSettingTab(this.app, this));
    this.data.training = parseTraining(this.data.training);
    this.data.recentMotions = Array.isArray(this.data.recentMotions) ? this.data.recentMotions.filter(m => typeof m === 'string') : [];
    this.registerView(VIEW_TYPE, leaf => new LogicTreeView(leaf, this));
    this.registerView(TRAIN_VIEW, leaf => new TrainerView(leaf, this));
    this.registerExtensions([EXTENSION], VIEW_TYPE);
    this.addRibbonIcon('network', tr('Новое дерево'), () => this.createTree());
    this.addRibbonIcon('timer', tr('Тренировка дебатов'), () => this.openTrainer());
    this.addCommand({ id: 'new-tree', name: tr('Новое дерево'), callback: () => this.createTree() });
    this.addCommand({ id: 'analyze-motion', name: tr('Разбор решения, темы или резолюции'), callback: () => this.analyze() });
    this.addCommand({
      id: 'export-pdf',
      name: tr('Экспорт в PDF'),
      checkCallback: checking => {
        const view = this.app.workspace.getActiveViewOfType(LogicTreeView);
        if (view && !checking) view.exportPdf();
        return Boolean(view);
      },
    });
    this.addCommand({
      id: 'speech-plan',
      name: tr('План речи'),
      checkCallback: checking => {
        const view = this.app.workspace.getActiveViewOfType(LogicTreeView);
        if (view && !checking) view.openSpeechPlan();
        return Boolean(view);
      },
    });
    this.addCommand({ id: 'trainer', name: tr('Тренировка дебатов'), callback: () => this.openTrainer() });
  }

  async openTrainer() {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(TRAIN_VIEW)[0];
    if (!leaf) {
      leaf = ws.getLeaf(true);
      await leaf.setViewState({ type: TRAIN_VIEW, active: true });
    }
    await ws.revealLeaf(leaf);
    // На телефоне показ вкладки не делает её активной: без этого ввод и меню ушли бы в прежнюю.
    ws.setActiveLeaf(leaf, { focus: true });
  }

  applyLanguage() {
    const obsidianLang = typeof obsidian.getLanguage === 'function' ? obsidian.getLanguage() : '';
    setLanguage(languageFor(this.data.language, obsidianLang));
  }

  async analyze() {
    const view = this.app.workspace.getActiveViewOfType(LogicTreeView) || await this.createTree();
    if (view) view.startAnalysis();
  }

  onunload() {
    if (!this.prefsTimer) return;
    window.clearTimeout(this.prefsTimer);
    this.saveData(this.data);
  }

  savePrefs() {
    window.clearTimeout(this.prefsTimer);
    this.prefsTimer = window.setTimeout(() => {
      this.prefsTimer = null;
      this.saveData(this.data);
    }, 500);
  }

  async createTree() {
    const active = this.app.workspace.getActiveFile();
    const folder = this.app.fileManager.getNewFileParent(active ? active.path : '');
    const base = folder.path === '/' ? '' : `${folder.path}/`;
    let n = 1;
    let path = normalizePath(`${base}${tr('Дерево {n}', { n: 1 })}.${EXTENSION}`);
    while (this.app.vault.getAbstractFileByPath(path)) {
      n += 1;
      path = normalizePath(`${base}${tr('Дерево {n}', { n })}.${EXTENSION}`);
    }
    const file = await this.app.vault.create(path, '');
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.openFile(file);
    return leaf.view instanceof LogicTreeView ? leaf.view : null;
  }
}

function setLanguage(lang) {
  LANG = lang === 'ru' ? 'ru' : 'en';
  QUESTIONS = deepTr(QUESTIONS_RU);
  CHAIN = deepTr(CHAIN_RU);
  CRITERIA = deepTr(CRITERIA_RU);
  FRIC_LINKS = deepTr(FRIC_LINKS_RU);
  POSITIONS = deepTr(POSITIONS_RU);
  MOTION_TYPES = deepTr(MOTION_TYPES_RU);
  LIFE_TYPES = deepTr(LIFE_TYPES_RU);
  STUDY_TYPES = deepTr(STUDY_TYPES_RU);
  TYPES = { ...MOTION_TYPES, ...LIFE_TYPES, ...STUDY_TYPES };
  SECTIONS_BEFORE = deepTr(SECTIONS_BEFORE_RU);
  SECTIONS_AFTER = deepTr(SECTIONS_AFTER_RU);
  ARGUMENT_TEXT = deepTr(ARGUMENT_TEXT_RU);
  OPENING_TEXT = deepTr(OPENING_TEXT_RU);
  TEAM_NAME = deepTr(TEAM_NAME_RU);
  PREP_STAGES = deepTr(PREP_STAGES_RU);
  TRAIN_MOTIONS = LANG === 'ru' ? TRAIN_MOTIONS_RU : TRAIN_MOTIONS_EN;
  TRAIN_FOLDER = tr('Тренировки');
  TRAIN_TABS = deepTr(TRAIN_TABS_RU);
  TRAIN_FIELDS = deepTr(TRAIN_FIELDS_RU);
  ARG_FIELDS = deepTr(ARG_FIELDS_RU);
  TIP_START = tr(TIP_START_RU);
  TIP_SELECT = tr(TIP_SELECT_RU);
  HELP_LINES = deepTr(HELP_LINES_RU);
  KINDS = deepTr(KINDS_RU);
  POSITION_CHOICES = [...POSITIONS.map(([key, short, name]) => [key, short, name]), ['', tr('Не знаю'), tr('Готовлюсь к обеим сторонам')]];
  RIC = deepTr(RIC_RU);
  return LANG;
}

const localizedTables = () => ({
  QUESTIONS, CHAIN, CRITERIA, FRIC_LINKS, POSITIONS, MOTION_TYPES, LIFE_TYPES, STUDY_TYPES, TYPES,
  SECTIONS_BEFORE, SECTIONS_AFTER, ARGUMENT_TEXT, OPENING_TEXT, TEAM_NAME, PREP_STAGES,
  TRAIN_MOTIONS, TRAIN_FOLDER, TRAIN_TABS, TRAIN_FIELDS, ARG_FIELDS,
  TIP_START, TIP_SELECT, HELP_LINES, KINDS, POSITION_CHOICES, RIC,
});

setLanguage('en');

module.exports = LogicTreePlugin;
Object.assign(module.exports, {
  NODE_W,
  CHAIN,
  layout,
  parseDoc,
  visibleIds,
  hiddenCount,
  focusIds,
  addBlock,
  removeBlock,
  removeBranch,
  canMove,
  moveBlock,
  setSide,
  rankQuestions,
  recordTransition,
  questionChoices,
  MOTION_TYPES,
  LIFE_TYPES,
  kindOf,
  detectLife,
  detectKind,
  setMySide,
  pickSize,
  blockWidth,
  detectMotion,
  buildSkeleton,
  analysisSteps,
  stepAnswers,
  wrapText,
  exportScale,
  pdfPathFor,
  buildPdf,
  teamOf,
  setPosition,
  fricTargets,
  ricOf,
  prepStatus,
  speechPlan,
  planPathFor,
  TRAIN_MOTIONS,
  motionBank,
  pickMotion,
  clock,
  trainPace,
  speakPart,
  sheetParts,
  ideaLines,
  trainingNote,
  missingFields,
  parseTraining,
  trainingPath,
  setLanguage,
  tr,
  sameQ,
  canonQ,
  languageFor,
  localizedTables,
  EN,
});
// Таблицы меняются вместе с языком, поэтому снаружи они читаются через геттеры.
['CHAIN', 'MOTION_TYPES', 'LIFE_TYPES', 'STUDY_TYPES', 'TRAIN_MOTIONS'].forEach(name => {
  Object.defineProperty(module.exports, name, { get: () => localizedTables()[name], enumerable: true, configurable: true });
});
