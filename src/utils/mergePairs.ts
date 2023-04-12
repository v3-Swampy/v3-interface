export default function mergePairs(arr: any) {
    const merged = [];
  
    for (let i = 0; i < arr.length; i += 2) {
      merged.push([arr[i], arr[i + 1]]);
    }
  
    return merged;
  }