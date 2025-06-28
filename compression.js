// Сериализация: сортируем, кодируем разницу между числами, пакуем в base64
function serialize(nums) {
    if (!nums.length) return '';
    nums = nums.slice().sort((a, b) => a - b);
    let deltas = [nums[0]];
    for (let i = 1; i < nums.length; ++i) {
        deltas.push(nums[i] - nums[i - 1]);
    }
    // Каждое число <= 300, разница <= 299, кодируем varint (7 бит на байт)
    let bytes = [];
    for (let n of deltas) {
        do {
            let b = n & 0x7F;
            n >>= 7;
            if (n) b |= 0x80;
            bytes.push(b);
        } while (n);
    }
    // Преобразуем в строку ASCII (base64)
    let bin = String.fromCharCode(...bytes);
    return btoa(bin);
}

// Десериализация
function deserialize(str) {
    if (!str) return [];
    let bin = atob(str);
    let bytes = Array.from(bin, c => c.charCodeAt(0));
    let nums = [];
    let n = 0, shift = 0;
    for (let b of bytes) {
        n |= (b & 0x7F) << shift;
        if (b & 0x80) {
            shift += 7;
        } else {
            nums.push(n);
            n = 0;
            shift = 0;
        }
    }
    // Восстанавливаем числа из дельт
    for (let i = 1; i < nums.length; ++i) {
        nums[i] += nums[i - 1];
    }
    return nums;
}

// Сериализация через битовую маску (только для уникальных чисел 1..300)
function serializeBitmap(nums) {
    let bitmap = new Uint8Array(38); // 300 бит
    for (let n of nums) {
        if (n < 1 || n > 300) throw new Error('Out of range');
        let idx = n - 1;
        bitmap[idx >> 3] |= 1 << (idx & 7);
    }
    // Преобразуем в строку ASCII (base64)
    let bin = String.fromCharCode(...bitmap);
    return 'B' + btoa(bin); // 'B' - маркер bitmap
}

// Десериализация битовой маски
function deserializeBitmap(str) {
    let bin = atob(str.slice(1));
    let bitmap = Array.from(bin, c => c.charCodeAt(0));
    let nums = [];
    for (let i = 0; i < 300; ++i) {
        if (bitmap[i >> 3] & (1 << (i & 7))) nums.push(i + 1);
    }
    return nums;
}

// Улучшенная сериализация: выбирает лучший способ
function serializeSmart(nums) {
    if (!nums.length) return '';
    // Проверяем уникальность
    let unique = new Set(nums);
    let isUnique = unique.size === nums.length;
    let bitmapStr = '';
    if (isUnique) {
        bitmapStr = serializeBitmap(nums);
    }
    let deltaStr = 'D' + serialize(nums); // 'D' - маркер delta
    // Выбираем более короткую строку
    if (bitmapStr && bitmapStr.length < deltaStr.length) return bitmapStr;
    return deltaStr;
}

// Улучшенная десериализация
function deserializeSmart(str) {
    if (!str) return [];
    if (str[0] === 'B') return deserializeBitmap(str);
    if (str[0] === 'D') return deserialize(str.slice(1));
    throw new Error('Unknown format');
}

// Коэффициент сжатия (гарантировать минимум 50%)
function compressionRatio(orig, compressed) {
    if (orig.length === 0) return '0';
    let percent = ((compressed.length / orig.length) * 100);
    return percent.toFixed(0); // процент
}

// Тесты
function runTests() {
    const tests = [
        { name: 'Short: [1,2,3]', arr: [1,2,3] },
        { name: 'Short: [10,20,30]', arr: [10,20,30] },
        { name: 'All 1-digit', arr: Array.from({length:9}, (_,i)=>i+1) },
        { name: 'All 2-digit', arr: Array.from({length:90}, (_,i)=>i+10) },
        { name: 'All 3-digit', arr: Array.from({length:201}, (_,i)=>i+100) },
        { name: 'Random 50', arr: Array.from({length:50}, ()=>1+Math.floor(Math.random()*300)) },
        { name: 'Random 100', arr: Array.from({length:100}, ()=>1+Math.floor(Math.random()*300)) },
        { name: 'Random 500', arr: Array.from({length:500}, ()=>1+Math.floor(Math.random()*300)) },
        { name: 'Random 1000', arr: Array.from({length:1000}, ()=>1+Math.floor(Math.random()*300)) },
        { name: 'Each number x3 (900)', arr: Array.from({length:300}, (_,i)=>[i+1,i+1,i+1]).flat() },
    ];
    for (const {name, arr} of tests) {
        const orig = JSON.stringify(arr);
        const compressed = serializeSmart(arr);
        const restored = deserializeSmart(compressed);
        const ratio = compressionRatio(orig, compressed);
        const ok = JSON.stringify(restored) === JSON.stringify(arr.slice().sort((a,b)=>a-b));
        console.log(`${name}:`);
        console.log(`  Original: ${orig.length} bytes`);
        console.log(`  Compressed: ${compressed.length} bytes`);
        console.log(`  Ratio: ${ratio}%`);
        console.log(`  Correct: ${ok}`);
        if (orig.length > 0)
            console.log(`  Compressed string: ${compressed}`);
        // console.log(`  Deserialized: ${JSON.stringify(restored)}`);
    }
}

if (require.main === module) {
    runTests();
}

module.exports = { serialize: serializeSmart, deserialize: deserializeSmart };
