import os
import json
import glob

data_dir = 'data'
db = []
original_db = []

# Load original DB from 視聴アプリ
try:
    with open(os.path.join('..', '視聴アプリ', 'data', 'db.json'), 'r', encoding='utf-8') as f:
        original_db = json.load(f)
except Exception as e:
    print(f"Warning: Could not load 視聴アプリ db.json: {e}")

current_db = []
try:
    with open(os.path.join(data_dir, 'db.json'), 'r', encoding='utf-8') as f:
        current_db = json.load(f)
except Exception:
    pass

for ep_folder in sorted(os.listdir(data_dir)):
    ep_path = os.path.join(data_dir, ep_folder)
    if not os.path.isdir(ep_path): continue
    if ep_folder.startswith('.'): continue
    
    parts = ep_folder.split('_', 2)
    if len(parts) >= 3:
        prefix, artist, title = parts[0], parts[1], parts[2]
    elif len(parts) == 2:
        prefix = parts[0]
        artist, title = parts[0], parts[1]
    else:
        prefix = '99'
        artist, title = 'Unknown', ep_folder

    is_new = prefix in ['01', '02', '03', '04']

    ep_data = {
        'id': ep_folder,
        'prefix': prefix,
        'artist': artist,
        'title': title,
        'is_new': is_new,
        'jacket': None,
        'artist_img': None,
        'teaser': None,
        'tracks': [],
        'price': '¥1,000',
        'tracks_count': 0,
        'description': '新譜！' if is_new else '旧譜（持ち込み極少）'
    }

    # Social links default
    if '波呂' in artist and 'y4ttaze' in artist:
        ep_data['x'] = 'https://x.com/y4ttaze'
        ep_data['yt'] = 'https://www.youtube.com/@y4ttaze'
    elif '波呂' in artist:
        ep_data['x'] = 'https://x.com/c_alam_ela'
        ep_data['yt'] = 'https://www.youtube.com/@c_alam_ela'
    else:
        ep_data['x'] = 'https://x.com/y4ttaze'
        ep_data['yt'] = 'https://www.youtube.com/@y4ttaze'

    # Find jacket
    jackets = (glob.glob(os.path.join(ep_path, '*jacket*.*')) + 
               glob.glob(os.path.join(ep_path, '*.png')) + 
               glob.glob(os.path.join(ep_path, '*.jpg')) + 
               glob.glob(os.path.join(ep_path, '*.jpeg')) + 
               glob.glob(os.path.join(ep_path, '*.webp')) + 
               glob.glob(os.path.join(ep_path, '*.svg')))
    jackets = [j for j in jackets if not os.path.basename(j).lower().startswith('artist.')]
    if jackets:
        ep_data['jacket'] = jackets[0]

    # Find artist image
    artist_imgs = glob.glob(os.path.join(ep_path, 'artist*.*')) + glob.glob(os.path.join(data_dir, f'artist*_{artist}.*'))
    if artist_imgs:
        img_path = artist_imgs[0]
        ep_data['artist_img'] = img_path
    
    if not ep_data['artist_img']:
        for ext in ['.jpg', '.png', '.jpeg', '.webp']:
            cand = os.path.join(data_dir, f'artist_{artist}{ext}')
            if os.path.exists(cand):
                ep_data['artist_img'] = cand
                break

    # Find teaser
    teasers = glob.glob(os.path.join(ep_path, '*teaser*.*')) + glob.glob(os.path.join(ep_path, '*.mov')) + glob.glob(os.path.join(ep_path, '*.mp4'))
    if teasers:
        ep_data['teaser'] = teasers[0]

    # Sync tracks from original 視聴アプリ DB
    original_ep = next((ep for ep in original_db if ep_folder == ep.get('id')), None)
    if not original_ep:
        original_ep = next((ep for ep in original_db if ep_folder.startswith(ep.get('id', '___')) or ep.get('title') == title), None)
        
    if original_ep and 'tracks' in original_ep:
        clean_tracks = []
        for t in original_ep['tracks']:
            clean_tracks.append({"title": t.get("title", "")})
        ep_data['tracks'] = clean_tracks
        ep_data['tracks_count'] = len(clean_tracks)
        if original_ep.get('title'):
            ep_data['title'] = original_ep['title']
        if original_ep.get('jacket') and not ep_data['jacket']:
            ep_data['jacket'] = original_ep['jacket']
        if original_ep.get('type'):
            ep_data['type'] = original_ep['type']
        if original_ep.get('images'):
            ep_data['images'] = original_ep['images']

    # Preserve current db manual overrides
    current_ep = next((ep for ep in current_db if ep.get('id') == ep_folder), None)
    if current_ep:
        for key in ['x', 'yt', 'nico', 'price', 'description']:
            if key in current_ep:
                ep_data[key] = current_ep[key]

    # Read optional info.json
    info_path = os.path.join(ep_path, 'info.json')
    if os.path.exists(info_path):
        with open(info_path, 'r', encoding='utf-8') as f:
            try:
                info = json.load(f)
                if 'price' in info:
                    ep_data['price'] = info['price']
                if 'description' in info:
                    ep_data['description'] = info['description']
                if 'jacket' in info:
                    ep_data['jacket'] = info['jacket']
                if 'type' in info:
                    ep_data['type'] = info['type']
                if 'images' in info:
                    ep_data['images'] = info['images']
            except:
                pass
    
    if ep_data.get('type') == 'merch':
        ep_data['tracks'] = []
        ep_data['tracks_count'] = 0
    
    db.append(ep_data)

with open(os.path.join(data_dir, 'db.json'), 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)
print("デジタルお品書き db.json built successfully! Count:", len(db))
