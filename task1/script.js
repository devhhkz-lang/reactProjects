function createTask(name, failChance = 0.3) {
  let count = 0;
  let status = "idle";     
  let duration = null;     

  function run() {
    count++;
    status = "running";

    const delay = Math.floor(Math.random() * 1500) + 500;
    const start = performance.now();

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        duration = Math.round(performance.now() - start);

        if (Math.random() < failChance) {
          status = "failed";
          reject(new Error(`${name} failed`));
        } else {
          status = "completed";
          resolve({ name, duration });
        }
      }, delay);
    });
  }

  return {
    name,
    run,
    getCount:    () => count,
    getStatus:   () => status,
    getDuration: () => duration,
    reset() {
      count = 0;
      status = "idle";
      duration = null;
    },
  };
}

const tasks = [
  createTask("Load Users"),
  createTask("Load Posts"),
  createTask("Load Comments"),
];

const list = document.getElementById("task-list");

function render() {
  list.innerHTML = tasks.map((t, i) => `
    <li class="card ${t.getStatus()}">
      <h3>${t.name}</h3>
      <p>Status: <b>${t.getStatus()}</b></p>
      <p>Runs: ${t.getCount()}</p>
      <p>Time: ${t.getDuration() ?? "—"} ms</p>
      <button data-run="${i}" ${t.getStatus() === "running" ? "disabled" : ""}>Run</button>
      <button data-reset="${i}">Reset</button>
    </li>
  `).join("");
}

async function runOne(task) {
  const promise = task.run();  
  render();                     
  try {
    await promise;
  } catch (err) {
    // 
  }
  render();            
}

list.addEventListener("click", (e) => {
  const { run, reset } = e.target.dataset;
  if (run !== undefined) runOne(tasks[run]);
  if (reset !== undefined) { tasks[reset].reset(); render(); }
});

const runAllBtn = document.getElementById("run-all");
const allStatus = document.getElementById("all-status");

async function runAll() {
  runAllBtn.disabled = true;
  allStatus.textContent = "Running...";
  allStatus.className = "running";          

  const promises = tasks.map((t) => t.run());
  render();

  const results = await Promise.allSettled(promises);

  render();
  const ok = results.filter((r) => r.status === "fulfilled").length;
  allStatus.textContent =
    `All tasks finished: ${ok} completed, ${results.length - ok} failed`;
  allStatus.className = "done";             
  runAllBtn.disabled = false;
}

runAllBtn.addEventListener("click", runAll);

const compareBtn = document.getElementById("compare");
const compareResult = document.getElementById("compare-result");

async function compare() {
  compareBtn.disabled = true;
  runAllBtn.disabled = true;

  // 1) Sequential: каждая задача ждёт предыдущую
  compareResult.textContent = "Sequential running...";
  const t0 = performance.now();
  for (const t of tasks) {
    await runOne(t);
  }
  const seq = Math.round(performance.now() - t0);

  // 2) Concurrent: запускаем все сразу и ждём всех
  compareResult.textContent = "Concurrent running...";
  const t1 = performance.now();
  await Promise.allSettled(tasks.map(runOne));
  const con = Math.round(performance.now() - t1);

  compareResult.innerHTML = `
    Sequential: <b>${seq} ms</b><br>
    Concurrent: <b>${con} ms</b><br>
    Concurrent was ${(seq / con).toFixed(1)}× faster`;

  compareBtn.disabled = false;
  runAllBtn.disabled = false;
}

compareBtn.addEventListener("click", compare);

const demoOutput = document.getElementById("demo-output");

function log(text) {
  console.log(text);                       
  const li = document.createElement("li"); 
  li.textContent = text;
  demoOutput.append(li);
}

async function asyncFn() {
  log("G: async start");
  await Promise.resolve();
  log("H: async after await");
}

function eventLoopDemo() {
  demoOutput.innerHTML = "";

  log("A: script start");

  setTimeout(() => log("B: timeout 1"), 0);
  Promise.resolve().then(() => log("C: promise 1"));

  setTimeout(() => log("D: timeout 2"), 0);
  Promise.resolve().then(() => log("E: promise 2"));

  asyncFn();

  log("F: script end");
}

document.getElementById("run-demo").addEventListener("click", eventLoopDemo);

render();