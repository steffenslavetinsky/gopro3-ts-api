import GoPro from "./gopro";

test("turn off gopro", () => {
  const gopro = new GoPro();
  return gopro.turnOn().then((output) => console.log(output));
});

test("test get media", () => {
  const gopro = new GoPro();
  return gopro.listMedia().then((output) => console.log(output));
});
