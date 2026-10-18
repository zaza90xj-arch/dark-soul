/* DARK SOUL — مكتبة البرومبتات + مفردات مصنع البوستات */
(function () {
  const D = window.DS;
  D.PCATS = {
    real: 'صور واقعية', cinechar: 'شخصيات سينمائية', anime: 'أنمي وكرتون', games: 'ألعاب وفري فاير',
    logo: 'لوجوهات وهويات', profile: 'صور حسابات', wallpaper: 'خلفيات', poster: 'بوسترات أفلام',
    rain: 'حزن ومطر', love: 'حب ورومانسية', action: 'أكشن وغموض', neon: 'تصميمات نيون',
    story: 'كتابة قصص', dev: 'تطوير مواقع وتطبيقات', learn: 'تعلم وبرمجة'
  };
  const IMG = 'أي مولّد صور';
  const TXT = 'أي مساعد كتابة';
  const DEV = 'مساعد برمجة';
  // PR(قسم، العنوان، الوصف، النص، اللغة، الأداة، مميز؟)
  function PR(cat, title, desc, text, lang, tool, feat) {
    D.prompts.push({ id: 'r' + (D.prompts.length + 1), cat, title, desc, text, lang, tool, feat: !!feat, len: text.length < 220 ? 's' : 'l', added: D.prompts.length >= 20 ? '2026-10-17' : '2026-10-10' });
  }
  PR('real','بورتريه شارع ليلي','صورة واقعية لشخص تحت أضواء المدينة','Ultra realistic street portrait of a young man at night, wet asphalt reflecting neon signs, shallow depth of field, 85mm lens, cinematic color grading, natural skin texture, soft rim light, 4k','en',IMG,1);
  PR('real','قهوة وصباح هادئ','لقطة منتج دافئة','Realistic close-up of a ceramic coffee cup on a wooden table by a rainy window, soft morning light, steam rising, film grain, muted tones, photographed on 50mm','en',IMG);
  PR('cinechar','المحقق الغامض','شخصية سينمائية بأجواء نوار','Cinematic portrait of a mysterious detective in a long dark coat, face half in shadow, rain falling, single streetlight, anamorphic lens flare, teal and orange palette, film still','en',IMG,1);
  PR('cinechar','المحاربة الوحيدة','بطلة بملامح قوية','Epic cinematic portrait of a lone female warrior standing on a cliff at dusk, wind in her cloak, weathered armor, dramatic volumetric light, ultra detailed, movie still','en',IMG);
  PR('anime','فتى المطر','أنمي حزين هادئ','Anime style illustration of a boy standing under an umbrella in a quiet rainy street at night, soft glowing lights, detailed reflections, melancholic mood, painterly background, high quality','en',IMG);
  PR('anime','كرتون ثلاثي الأبعاد','شخصية لطيفة ثلاثية الأبعاد','Cute 3D cartoon character of a small fox wearing a hoodie, big expressive eyes, soft studio lighting, pastel background, smooth shading, high detail render','en',IMG);
  PR('games','جندي باتل رويال','شخصية ألعاب عامة (بدون أسماء مسجلة)','Stylized battle royale soldier character, tactical vest, neon blue accents, dynamic action pose, game concept art, dramatic lighting, detailed textures, dark urban background','en',IMG,1);
  PR('games','بنر بطولة','بنر لبطولة ألعاب','Esports tournament banner, glowing neon blue and red energy, abstract sparks, bold empty space for title text, dark background, ultra sharp, 16:9','en',IMG);
  PR('logo','لوجو نيون بسيط','شعار لمشروع تقني','Minimal logo design for a tech brand, geometric shape, glowing neon blue outline on black background, clean vector style, centered, no text','en',IMG);
  PR('logo','هوية بصرية داكنة','فكرة هوية كاملة','Brand identity mockup for a dark premium brand: logo, business card, and social avatar, black and electric purple palette, subtle glow, flat lay, studio lighting','en',IMG);
  PR('profile','صورة حساب غامضة','أفاتار بشخصية ظل','Profile avatar of a hooded silhouette with glowing cyan eyes, dark smoky background, symmetrical composition, high contrast, square crop','en',IMG,1);
  PR('profile','صورة حساب هادئة','أفاتار رسم ناعم','Soft digital painting avatar of a person looking at the moon, gentle purple and blue gradient sky, calm mood, circular crop friendly','en',IMG);
  PR('wallpaper','خلفية موبايل نيون','عمودية 9:16','Vertical phone wallpaper, abstract flowing neon lines in electric blue and magenta over deep black, subtle grain, minimal, 9:16, no text','en',IMG);
  PR('wallpaper','خلفية كمبيوتر ليلية','أفقية 16:9','Wide desktop wallpaper of a quiet city skyline at night under heavy rain, glowing windows, cinematic haze, dark moody palette, 16:9, ultra detailed','en',IMG);
  PR('poster','بوستر فيلم غموض','بوستر بمساحة للعنوان','Movie poster concept for a mystery thriller, silhouette of a man under a single lamp, fog, strong negative space at the top for title, grainy film texture, red accent light','en',IMG);
  PR('poster','بوستر فيلم رومانسي','بأجواء دافئة','Romantic drama movie poster, two silhouettes sharing an umbrella in soft rain, warm street light, bokeh, delicate color grading, space for title and credits','en',IMG);
  PR('rain','مشهد وداع','حزن ومطر','Cinematic scene of a person standing alone at a train station at night in heavy rain, blurred lights, wet platform, melancholic blue tones, shallow depth of field','en',IMG,1);
  PR('rain','نافذة المطر','هدوء حزين','Close-up of a rain-covered window with the blurred city lights behind it, a cup of tea on the sill, quiet lonely mood, cool tones, photorealistic','en',IMG);
  PR('love','عشاء تحت النجوم','رومانسية دافئة','Romantic outdoor dinner for two under string lights and stars, candle glow, soft bokeh, warm cinematic tones, shallow depth of field, photorealistic','en',IMG);
  PR('love','يدان متشابكتان','مشهد حب بسيط','Close-up of two hands holding each other, soft golden hour light, shallow depth of field, tender mood, film photography look','en',IMG);
  PR('action','مطاردة على الأسطح','أكشن سينمائي','Cinematic action shot of a hooded figure leaping between rooftops at night, city lights below, motion blur, dramatic rim light, wide-angle lens, high detail','en',IMG);
  PR('action','قناع الليل','غموض وهيبة','Mysterious masked figure standing in a foggy alley, single red light behind, dramatic silhouette, ultra detailed, dark thriller atmosphere','en',IMG);
  PR('neon','مدينة نيون','سايبر بانك','Cyberpunk city street at night, glowing neon signs in blue, pink and purple, wet reflective ground, volumetric fog, ultra detailed, cinematic wide shot','en',IMG);
  PR('neon','خط نيون مجرد','تصميم تجريدي','Abstract neon light trails swirling across a black background, electric blue to violet gradient, long exposure look, sharp glow, 4k','en',IMG);
  PR('story','بداية قصة غامضة','اكتب افتتاحية','اكتب افتتاحية قصة غامضة بالعربية الفصحى لا تزيد عن 200 كلمة، تبدأ بمشهد غريب في مدينة ممطرة وتنتهي بسؤال يجعل القارئ يريد المتابعة. استخدم جملًا قصيرة وصورًا حسية، وتجنّب الكليشيهات.','ar',TXT,1);
  PR('story','حوار بين شخصيتين','تدريب على الحوار','اكتب حوارًا باللهجة المصرية بين صديقين قديمين التقيا بعد خصام طويل. لا تذكر سبب الخصام صراحة، بل دعه يظهر من التفاصيل. اجعل الحوار من 12 سطرًا وبنهاية مفتوحة.','ar',TXT);
  PR('dev','واجهة موقع عربي','طلب تصميم واجهة','صمم لي صفحة رئيسية لموقع عربي RTL باستخدام HTML وCSS وJavaScript فقط، بتصميم داكن مع ألوان نيون، وتجاوب كامل مع الهاتف، وبحث بسيط، وبطاقات محتوى. اشرح هيكل الملفات واكتب الكود كاملًا.','ar',DEV,1);
  PR('dev','نظام مفضلة محلي','ميزة عملية','اكتب لي كود JavaScript لنظام مفضلة يحفظ في localStorage مع إضافة وحذف وعرض وتصدير واستيراد JSON، مع معالجة الأخطاء عندما يكون التخزين غير متاح. وضّح كيف أختبره على الهاتف.','ar',DEV);
  PR('learn','خطة تعلم برمجة','خطة 30 يومًا','أنا مبتدئ ولا أملك سوى هاتف. ضع لي خطة 30 يومًا لتعلم أساسيات HTML وCSS وJavaScript، مع تمرين صغير لكل يوم يمكن تنفيذه من الهاتف، وطريقة لاختبار نفسي في نهاية كل أسبوع.','ar',TXT,1);
  PR('learn','اشرح لي بالأمثلة','شرح مبسط','اشرح لي مفهوم الـ API كأنني في الصف الأول الثانوي، بلهجة مصرية مبسطة، مع مثال من الحياة اليومية ثم مثال كود قصير بلغة JavaScript، وأنهِ بثلاثة أسئلة تدريب.','ar',TXT);

  /* ===== مفردات مصنع البوستات (تركيب محلي، لا ذكاء اصطناعي) ===== */
  // {t} = الموضوع الذي يكتبه المستخدم. o = افتتاح، m = وسط، c = ختام
  D.pools = {
    sad: {
      eg: {
        o: ['مش كل وجع بيتحكي، في وجع بيتعاش بصمت.', 'فجأة بقيت أفهم إن الناس مش زي ما كنت فاكر.', 'في ليالي بتبقى فيها الدنيا أتقل من الصدر.'],
        m: ['كل مرة افتكر {t} بحس إن حاجة جوايا بتقع من غير صوت.', 'كنت فاكر إن {t} هيعدّي، بس الأيام بتعدي والأثر بيفضل.', 'اللي بيوجع في {t} إنه كان أقرب مما يتخيل حد.', 'مفيش حاجة بتكسرني زي إن {t} يبقى ذكرى وأنا لسه عايش فيه.'],
        c: ['والحمد لله إني اتعلمت أبتسم وأنا تعبان.', 'ومع كده هكمل، لأن مفيش حد هيكمل بدالي.', 'وأهو بنحاول ننسى، والأيام هي اللي بتحكم.']
      },
      ar: {
        o: ['ثمة أوجاعٌ لا تُروى، بل تُعاش بهدوءٍ ثقيل.', 'حين يهدأ الليل تتكلم الذاكرة بصوتٍ أعلى.', 'تعلّمتُ أن بعض الغياب أقسى من أي حضورٍ جارح.'],
        m: ['كلما مرّ ذكر {t} شعرتُ بشيءٍ ينكسر في صدري بلا ضجيج.', 'ظننتُ أن {t} سيمرّ كغيمةٍ عابرة، فإذا به يستوطن الأيام.', 'ما يؤلم في {t} أنه كان أقرب مما ظننتُ وأبعد مما احتملت.', 'لم أكن أعلم أن {t} قادرٌ على أن يغيّر ملامح قلبي هكذا.'],
        c: ['ومع ذلك أبتسم، فالحياة لا تنتظر المتعبين.', 'وأمضي، لا لأنني نسيت، بل لأنني تعلمتُ كيف أحمل ما لا يُنسى.', 'وفي النهاية يبقى الصمت أصدق ما أملك.']
      }
    },
    love: {
      eg: {
        o: ['مش عارف أبدأ منين، بس كل الكلام بيوصلني ليكي.', 'في ناس بتدخل حياتك فتغير كل حاجة من غير ما تحس.', 'النهارده عايز أقولك حاجة بسيطة وصادقة.'],
        m: ['{t} عندي مش مجرد كلمة، ده إحساس بيدفّيني.', 'كل ما أفتكر {t} أبتسم من غير سبب، وأعرف إنك السبب.', 'لو الدنيا زحمة وتعبانة، {t} هو اللي بيرجعني لنفسي.', 'أحلى حاجة في {t} إنك كنتي فيه، وإنك لسه.'],
        c: ['وجودك كفاية، والباقي أنا هتصرف فيه.', 'خليكي، لأن الأيام معاكي أحلى.', 'وأنا هفضل أحبك بالطريقة اللي أعرفها: بصدق.']
      },
      ar: {
        o: ['لا أعرف من أين أبدأ، لكن كل الكلمات تعود إليك.', 'ثمة أشخاصٌ يدخلون حياتنا فيُغيّرون كل شيءٍ بصمت.', 'اليوم أريد أن أقول شيئًا بسيطًا وصادقًا.'],
        m: ['{t} عندي ليس كلمة، بل إحساسٌ يمنحني الدفء.', 'كلما تذكّرتُ {t} ابتسمتُ بلا سبب، وعرفتُ أنك السبب.', 'حين يزدحم العالم يعيدني {t} إلى نفسي.', 'أجمل ما في {t} أنك كنتَ فيه، ولا تزال.'],
        c: ['وجودك يكفي، والباقي أعرف كيف أتدبّره.', 'ابقَ، فالأيام معك أجمل.', 'وسأظلّ أحبك بالطريقة الوحيدة التي أعرفها: بصدق.']
      }
    },
    mystery: {
      eg: {
        o: ['الليل ده مش ساكت زي ما بيبان.', 'في حاجة غلط في الحكاية دي من أولها.', 'الظلام عمره ما بيخبي، بيستنى.'],
        m: ['كل حاجة بتقول إن {t} مجرد صدفة، بس الصدف مش بتتكرر بالشكل ده.', 'اللي يعرف سر {t} عمره ما هينام مرتاح.', 'ورا {t} حد بيتفرج وبيبتسم.', 'كل خيط في {t} بيوصل لباب مقفول من جوه.'],
        c: ['والباب ده لسه مفتوح شوية.', 'وأنا عارف اللي جاي، بس ماقلتش.', 'استنى، لسه الحكاية ما بدأتش.']
      },
      ar: {
        o: ['الليل ليس ساكنًا كما يبدو.', 'ثمة خللٌ في الحكاية منذ أول سطر.', 'الظلام لا يخفي شيئًا، إنه ينتظر.'],
        m: ['كل شيءٍ يقول إن {t} محض صدفة، لكن الصدف لا تتكرر بهذا الإتقان.', 'من يعرف سرّ {t} لن ينام مطمئنًا بعد اليوم.', 'خلف {t} من يراقب ويبتسم.', 'كل خيطٍ في {t} يؤدي إلى بابٍ مغلقٍ من الداخل.'],
        c: ['والباب ما زال مواربًا قليلًا.', 'وأنا أعرف ما سيأتي، لكنني لم أقل.', 'انتظر، فالحكاية لم تبدأ بعد.']
      }
    },
    cinematic: {
      eg: {
        o: ['المشهد بيبدأ بصمت، وبعدين الكاميرا بتقرّب.', 'نور خافت، ومطر، وراجل واقف مستني.', 'الموسيقى بتهدّى... وكل حاجة بتتغير.'],
        m: ['في اللحظة دي، {t} بيبقى هو اللي بيحكي القصة كلها.', 'الكاميرا بتلف حوالين {t} وكأنها بتحاول تفهمه.', 'كل لقطة عن {t} فيها معنى أكبر من الحوار.', 'من غير ما حد يتكلم، {t} قال كل حاجة.'],
        c: ['قطع... والشاشة بتسود.', 'والأحداث لسه ماخلصتش.', 'النهاية؟ لأ، دي بداية الفصل التاني.']
      },
      ar: {
        o: ['يبدأ المشهد بصمت، ثم تقترب الكاميرا ببطء.', 'ضوءٌ خافت، ومطر، ورجلٌ ينتظر.', 'تخفت الموسيقى... ويتغيّر كل شيء.'],
        m: ['في هذه اللحظة يصبح {t} الراوي الحقيقي للحكاية.', 'تدور الكاميرا حول {t} كأنها تحاول أن تفهمه.', 'كل لقطةٍ عن {t} تحمل معنى أكبر من الحوار.', 'دون أن يتكلم أحد، قال {t} كل شيء.'],
        c: ['قطع... وتسودّ الشاشة.', 'والأحداث لم تنتهِ بعد.', 'النهاية؟ لا، إنها بداية الفصل الثاني.']
      }
    },
    power: {
      eg: {
        o: ['مش لازم تعلن عن قوتك.', 'الهيبة بتتبني في الصمت.', 'في ناس شغلها الكلام، وفي ناس شغلها النتيجة.'],
        m: ['اللي يفهم {t} بجد عمره ما يتكلم عنه كتير.', 'خلّي {t} يتعلم منك، مش العكس.', 'اللي وقع في {t} وقام، أقوى من اللي ماوقعش.', 'مش كل معركة في {t} لازم تتخاض.'],
        c: ['كمّل، والزمن هو اللي هيتكلم.', 'ومتنساش: القمة لمن يصبر.', 'اللي بيكمل هو اللي بيكسب.']
      },
      ar: {
        o: ['لا حاجة لأن تُعلن عن قوّتك.', 'الهيبة تُبنى في الصمت.', 'بعض الناس يتقنون الكلام، وبعضهم يتقنون النتيجة.'],
        m: ['من يفهم {t} حقًّا لا يكثر الحديث عنه.', 'اجعل {t} يتعلم منك، لا العكس.', 'من سقط في {t} ونهض أقوى ممن لم يسقط قط.', 'ليست كل معركةٍ في {t} تستحق أن تُخاض.'],
        c: ['واصل، فالزمن هو من سيتكلم.', 'ولا تنسَ: القمة لمن يصبر.', 'من يستمر هو من ينتصر.']
      }
    }
  };
  D.FEELS = { sad: 'حزين', love: 'رومانسي', mystery: 'غامض', cinematic: 'سينمائي', power: 'تحفيزي' };
  // ربط شعور المصنع بأقسام المكتبة (للاختيار من المكتبة)
  D.FEEL_LIB = { sad: { cat: 'sad' }, love: { cat: 'love' }, mystery: { cat: 'action', subs: ['mystery', 'char', 'story', 'twist'] }, cinematic: { cat: 'action', subs: ['cinema', 'story'] }, power: { cat: 'action', subs: ['quote', 'char'] } };
})();
