"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../app/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  deadline: string;
};

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "tasks"));
        const tasksData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        setTasks(tasksData);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };
    fetchTasks();
  }, []);

  const calculateTimeRemaining = useCallback((deadline: string): number => {
    const deadlineTime = new Date(deadline).getTime();
    const now = Date.now();
    return deadlineTime - now;
  }, []);

  const formatTimeRemaining = (remaining: number): string => {
    if (remaining <= 0) return "Waktu habis!";
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aRemaining = calculateTimeRemaining(a.deadline);
      const bRemaining = calculateTimeRemaining(b.deadline);
      return aRemaining - bRemaining;
    });
  }, [tasks, calculateTimeRemaining]);

  const addTask = async (): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: "Tambah Kegiatan",
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nama kegiatan">' +
        '<input id="swal-input2" type="datetime-local" class="swal2-input">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const text = (document.getElementById("swal-input1") as HTMLInputElement)?.value.trim();
        const deadline = (document.getElementById("swal-input2") as HTMLInputElement)?.value;
        if (!text || !deadline) {
          Swal.showValidationMessage("Semua kolom harus diisi!");
          return;
        }
        return [text, deadline];
      },
    });

    if (formValues) {
      const newTask: Omit<Task, "id"> = {
        text: formValues[0],
        completed: false,
        deadline: formValues[1],
      };
      try {
        const docRef = await addDoc(collection(db, "tasks"), newTask);
        setTasks((prevTasks) => [...prevTasks, { id: docRef.id, ...newTask }]);
      } catch (error) {
        console.error("Error adding task:", error);
      }
    }
  };

  const editTask = async (task: Task) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Kegiatan",
      html:
        `<input id="swal-input1" class="swal2-input" value="${task.text}" placeholder="Nama kegiatan">` +
        `<input id="swal-input2" type="datetime-local" class="swal2-input" value="${task.deadline}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const text = (document.getElementById("swal-input1") as HTMLInputElement)?.value.trim();
        const deadline = (document.getElementById("swal-input2") as HTMLInputElement)?.value;
        if (!text || !deadline) {
          Swal.showValidationMessage("Semua kolom harus diisi!");
          return;
        }
        return [text, deadline];
      },
    });

    if (formValues) {
      const taskRef = doc(db, "tasks", task.id);
      try {
        await updateDoc(taskRef, {
          text: formValues[0],
          deadline: formValues[1],
        });
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id ? { ...t, text: formValues[0], deadline: formValues[1] } : t
          )
        );
      } catch (error) {
        console.error("Error updating task:", error);
      }
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    const confirm = await Swal.fire({
      title: "Yakin ingin menghapus?",
      text: "Tugas yang dihapus tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (confirm.isConfirmed) {
      try {
        await deleteDoc(doc(db, "tasks", id));
        setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  };

  const toggleComplete = async (id: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);

    const taskRef = doc(db, "tasks", id);
    await updateDoc(taskRef, {
      completed: !tasks.find((task) => task.id === id)?.completed,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl bg-gray-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-10 text-white">📝 To Do List</h1>

        <div className="flex justify-center mb-8">
          <button
            onClick={addTask}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg transition-all duration-200"
          >
            ➕ Tambah Kegiatan
          </button>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:grid grid-cols-12 gap-4 font-semibold text-gray-400 mb-4 px-6 text-sm">
          <div className="col-span-6 text-left">Kegiatan</div>
          <div className="col-span-2 text-center">Deadline</div>
          <div className="col-span-2 text-center">Sisa Waktu</div>
        </div>

        <ul className="space-y-4">
          <AnimatePresence>
            {sortedTasks.map((task) => {
              const timeLeft = calculateTimeRemaining(task.deadline);
              const formattedTime = formatTimeRemaining(timeLeft);
              const isExpired = formattedTime === "Waktu habis!";
              const rowColor = task.completed
                ? "bg-green-700/20 border-green-500"
                : isExpired
                  ? "bg-red-700/20 border-red-500"
                  : "bg-yellow-600/20 border-yellow-500";

              return (
                <motion.li
                  key={task.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`px-6 py-4 border rounded-xl ${rowColor} flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4`}
                >
                  {/* Mobile layout */}
                  <div className="sm:hidden space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold">Kegiatan</span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Hapus
                      </button>
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleComplete(task.id)}
                        className="h-5 w-5 mt-1"
                      />
                      <span className={`break-words ${task.completed ? "line-through text-gray-500" : "text-gray-100"}`}>
                        {task.text}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="block">Deadline: {new Date(task.deadline).toLocaleDateString("id-ID")}</span>
                      <span className="block">Sisa Waktu: {formattedTime}</span>
                    </div>
                    <button
                      onClick={() => editTask(task)}
                      className="text-indigo-400 hover:text-indigo-300 text-sm mt-1"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden sm:flex col-span-6 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleComplete(task.id)}
                      className="h-5 w-5 mt-1"
                    />
                    <span className={`break-words ${task.completed ? "line-through text-gray-500" : "text-gray-100"}`}>
                      {task.text}
                    </span>
                  </div>

                  <div className="hidden sm:block col-span-2 text-center text-sm text-gray-300">
                    {new Date(task.deadline).toLocaleDateString("id-ID")}
                  </div>

                  <div className="hidden sm:block col-span-2 text-center text-sm text-gray-300">
                    {formattedTime}
                  </div>

                  <div className="hidden sm:flex col-span-2 justify-end gap-3">
                    <button
                      onClick={() => editTask(task)}
                      className="text-indigo-400 hover:text-indigo-300 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Hapus
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
