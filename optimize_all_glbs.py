import struct
import json
import os
import glob

def optimize_glb(file_path):
    orig_size = os.path.getsize(file_path)
    with open(file_path, 'rb') as f:
        magic, ver, total_len = struct.unpack('<4sII', f.read(12))
        assert magic == b'glTF' and ver == 2, f"Not a valid glTF 2.0 file: {file_path}"
        
        chunk_len, chunk_type = struct.unpack('<II', f.read(8))
        assert chunk_type == 0x4E4F534A, "First chunk is not JSON"
        json_data = json.loads(f.read(chunk_len).decode('utf-8'))
        
        bin_len, bin_type = struct.unpack('<II', f.read(8))
        assert bin_type == 0x004E4942, "Second chunk is not BIN"
        old_bin = f.read(bin_len)

    old_bvs = json_data.get('bufferViews', [])
    old_accs = json_data.get('accessors', [])

    # 1. Identify which bufferViews are referenced by Draco
    draco_bv_map = {}  # old_bv_idx -> new_bv_idx
    new_bvs = []
    new_bin = bytearray()

    for m in json_data.get('meshes', []):
        for p in m.get('primitives', []):
            ext = p.get('extensions', {}).get('KHR_draco_mesh_compression')
            if ext and 'bufferView' in ext:
                old_idx = ext['bufferView']
                if old_idx not in draco_bv_map:
                    old_bv = old_bvs[old_idx]
                    offset = old_bv.get('byteOffset', 0)
                    length = old_bv['byteLength']
                    chunk_data = old_bin[offset:offset + length]

                    # 4-byte align start of bufferView
                    while len(new_bin) % 4 != 0:
                        new_bin.append(0)

                    new_offset = len(new_bin)
                    new_bin.extend(chunk_data)

                    new_bv_idx = len(new_bvs)
                    new_bvs.append({
                        'buffer': 0,
                        'byteOffset': new_offset,
                        'byteLength': length
                    })
                    draco_bv_map[old_idx] = new_bv_idx

                # Update primitive reference
                ext['bufferView'] = draco_bv_map[old_idx]

    # 2. Re-index accessors to keep ONLY accessors used by primitives
    acc_map = {}  # old_acc_idx -> new_acc_idx
    new_accs = []
    for m in json_data.get('meshes', []):
        for p in m.get('primitives', []):
            if 'indices' in p:
                old_i = p['indices']
                if old_i not in acc_map:
                    acc_map[old_i] = len(new_accs)
                    acc_copy = dict(old_accs[old_i])
                    # Draco decoders provide uncompressed geometry into memory,
                    # so bufferView & byteOffset are not needed and must be pruned
                    acc_copy.pop('bufferView', None)
                    acc_copy.pop('byteOffset', None)
                    new_accs.append(acc_copy)
                p['indices'] = acc_map[old_i]

            for attr_name, old_i in list(p.get('attributes', {}).items()):
                if old_i not in acc_map:
                    acc_map[old_i] = len(new_accs)
                    acc_copy = dict(old_accs[old_i])
                    acc_copy.pop('bufferView', None)
                    acc_copy.pop('byteOffset', None)
                    new_accs.append(acc_copy)
                p['attributes'][attr_name] = acc_map[old_i]

    # 3. Clean up glTF structure
    json_data['bufferViews'] = new_bvs
    json_data['accessors'] = new_accs
    json_data['buffers'] = [{'byteLength': len(new_bin)}]

    # Remove unused image, texture, and sampler declarations
    json_data.pop('images', None)
    json_data.pop('textures', None)
    json_data.pop('samplers', None)

    # Clean unused extension declarations
    exts_used = json_data.get('extensionsUsed', [])
    json_data['extensionsUsed'] = [e for e in exts_used if e != 'EXT_texture_webp']
    exts_req = json_data.get('extensionsRequired', [])
    json_data['extensionsRequired'] = [e for e in exts_req if e != 'EXT_texture_webp']

    # 4. Serialize to GLB with strict 4-byte padding
    while len(new_bin) % 4 != 0:
        new_bin.append(0)

    json_str = json.dumps(json_data, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    total_len = 12 + 8 + len(json_bytes) + 8 + len(new_bin)

    temp_path = file_path + '.opt.tmp'
    with open(temp_path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total_len))
        f.write(struct.pack('<II', len(json_bytes), 0x4E4F534A))
        f.write(json_bytes)
        f.write(struct.pack('<II', len(new_bin), 0x004E4942))
        f.write(new_bin)

    # Replace original file atomically
    os.replace(temp_path, file_path)
    new_size = os.path.getsize(file_path)
    reduction = (1 - new_size / orig_size) * 100
    print(f"Optimized {os.path.basename(file_path)}: {orig_size / (1024*1024):.2f} MB -> {new_size / (1024*1024):.2f} MB (-{reduction:.1f}%)")
    return orig_size, new_size

def main():
    glb_files = sorted(glob.glob('*.glb'))
    print(f"Found {len(glb_files)} GLB files to optimize:")
    total_orig = 0
    total_new = 0
    for glb in glb_files:
        o, n = optimize_glb(glb)
        total_orig += o
        total_new += n

    total_reduction = (1 - total_new / total_orig) * 100
    print("-" * 50)
    print(f"TOTAL: {total_orig / (1024*1024):.2f} MB -> {total_new / (1024*1024):.2f} MB (-{total_reduction:.1f}% reduction)")

if __name__ == '__main__':
    main()
