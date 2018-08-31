exports.splitFileName = (fileName) => {
  const split = fileName.split('.');
  const ext = split.pop();
  const name = split.join('.');
  return { name, ext };
};