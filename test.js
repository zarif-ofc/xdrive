const files = [
  { is_folder: 0, name: "file1.txt" },
  { is_folder: 1, name: "folder" },
  { is_folder: "0", name: "file2.txt" },
  { is_folder: false, name: "file3.txt" }
];
const regularFiles = files.filter((f) => Number(f.is_folder) === 0 || !f.is_folder);
console.log(regularFiles);
