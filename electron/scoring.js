function hasExactWord(text, word) {
  const re = new RegExp(`\\b${word}\\b`, "i");
  return re.test(text);
}

function hasOutNowAndLink(text) {
  return /out now/i.test(text) && /link in bio/i.test(text);
}

function scoreProfile(profile) {
  const scores = {
    artist: 0,
    prod: 0,
    media: 0,
  };

  const {
    username = "",
    nickname = "",
    bio = "",
    activity = "",
    links = [],
    highlights = [],
    posts = [],
  } = profile;

  const uname = (username || "").toLowerCase();
  const nick = (nickname || "").toLowerCase();
  const bioText = (bio || "").toLowerCase();
  const activityText = (activity || "").toLowerCase();
  const highlightsText = highlights.join(" ").toLowerCase();
  const allLinks = links.join(" ").toLowerCase();


  if (/beatstars|traktrain/.test(allLinks)) {
    scores.prod += 8;
  }

  if (/(fvr\.fan|lnk\.to|music\.apple\.com|album\.link|link\.me|app\.neptix\.com|even\.biz|distrokid\.com|itunes\.apple\.com|makeitmakecentsmusic\.com|eventbrite\.com|artists\.landr\.com|linkfire\.com|linkbio\.co|amazon\.com|pandora\.com|tidal\.com|music\.youtube\.com|deezer\.com|napster\.com|boomplay\.com|anghami\.com|iheart\.com|music\.empi\.re|unitedmasters\.com|ffm\.to|partiful\.com|hyperfollow\.com|tixr\.com|tickeri\.com)/.test(allLinks)) {
    scores.artist += 6;
  }

  if (/(youtube\.com|youtu\.be|open\.spotify\.com|spotify\.link|on\.soundcloud\.com|linktr\.ee)/.test(allLinks)) {
    scores.artist += 3;
  }


  if (/prod|beats/.test(uname)) scores.prod += 3;
  if (/studio|media|underground|label/.test(uname)) scores.media += 3;


  if (/producer|beatmaker/.test(nick)) scores.prod += 5;
  if (/artist|rapper/.test(nick)) scores.artist += 3;
  if (/studio|label/.test(nick)) scores.media += 3;
  if (/underground/.test(nick)) scores.media += 1;


  if (/(рэпер|рэппер|автор песен|исполнитель|artist|rapper|songwriter|performer)/.test(activityText)) {
    scores.artist += 6;

  } else if (/(музыкальный продюсер|продюсер|music producer|composer|звукорежиссёр|audio engineer|sound engineer)/.test(activityText)) {
    scores.prod += 6;

  } else if (/(сообщество|радиостанция|сми\/информационное агентство|ведущий новостей|режиссер|художественный руководитель|студия музыкального производства)/.test(activityText)) {
    scores.media += 3;

  } else if (/(музыка|music|музыкант|musician|музыкант\/группа|musucian\/band|band|группа|creator|digital creator| creator|digital creator|искусство)/.test(activityText)) {
    scores.artist += 1;
  }


  if (/(produced|credits|placements|prod by me|produced by me|prod me)/.test(highlightsText)) {
    scores.prod += 3;
  }

  if (hasExactWord(highlightsText, "beats")) {
    scores.prod += 2;
  }

  if (/send beats/.test(highlightsText)) {
    scores.artist += 3;
  }

  if (/promo/.test(highlightsText)) {
    scores.media += 3;
  }


  let prodBio = 0;
  let artistBio = 0;
  let mediaBio = 0;

  if (/(producer|beatmaker|drumkit|kit|soundkit|loopkit|sample pack|midikit)/.test(bioText)) {
    prodBio += 3;
  }

  if (/(new single|new album|new ep|new mixtape|tour|shows|booking|bookings)/.test(bioText)) {
    artistBio += 3;
  }

  if (/(live|rapper|singer)/.test(bioText) || hasExactWord(bioText, "artist")) {
    artistBio += 3;
  }

  if (/promo|artists|promotion/.test(bioText)) {
    mediaBio += 3;
  }

  if (hasOutNowAndLink(bioText)) {
    if (prodBio > 0) prodBio += 6;
    else artistBio += 6;
  }

  scores.prod += Math.min(prodBio, 6);
  scores.artist += Math.min(artistBio, 6);
  scores.media += Math.min(mediaBio, 6);


  if (
  scores.media >= 3 &&
  scores.prod <= scores.media + 1 &&
  scores.artist <= scores.media + 1
) {
  return { type: "MEDIA", scores };
}



  for (const post of posts.slice(0, 5)) {
    const text = (post.caption || "").toLowerCase();

    if (hasOutNowAndLink(text)) {
      if (/(drumkit|kit|soundkit|loopkit|sample pack|midikit)/.test(bioText)) {
        scores.prod += 3;
      } else {
        scores.artist += 3;
      }
    }

    if (/(drumkit|kit|soundkit|loopkit|sample pack|midikit)/.test(text)) {
      scores.prod += 3;
    }

    if (/snippet/.test(text)) {
      scores.artist += 2;
    }
  }


  if (scores.artist === 0 && scores.prod === 0 && scores.media === 0) {
    return { type: "TRASH", scores };
  }

  if (scores.artist >= 3 && scores.artist - Math.max(scores.prod, scores.media) >= 3) {
    return { type: "ARTIST", scores };
  }

  if (scores.prod >= 3 && scores.prod - Math.max(scores.artist, scores.media) >= 3) {
    return { type: "PRODUCER", scores };
  }

  return { type: "UNDEFINED", scores };
}

module.exports = { scoreProfile };
