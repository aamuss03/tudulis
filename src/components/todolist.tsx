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
    <div className="max-w-3xl mx-auto mt-10 p-4 text-gray-900">
      <h1 className="text-3xl font-semibold text-center text-white mb-8 tracking-wide">📝 To Do List</h1>
  
      <div className="flex justify-center mb-6">
        <button
          onClick={addTask}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full font-medium transition-colors shadow-md"
        >
          ➕ Tambah Kegiatan
        </button>
      </div>
  
      <div className="hidden sm:grid grid-cols-5 gap-4 font-medium text-center text-gray-600 mb-4 px-6">
        <div>Kegiatan</div>
        <div>Deadline</div>
        <div>Sisa Waktu</div>
      </div>
  
      <ul className="space-y-3">
        <AnimatePresence>
          {sortedTasks.map((task) => {
            const timeLeft = calculateTimeRemaining(task.deadline);
            const formattedTime = formatTimeRemaining(timeLeft);
            const isExpired = formattedTime === "Waktu habis!";
            const rowColor = task.completed
              ? "bg-green-100"
              : isExpired
              ? "bg-red-100"
              : "bg-yellow-100";
  
            return (
              <motion.li
                key={task.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className={`grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 items-center text-center px-4 sm:px-6 py-3 rounded-xl shadow-sm border ${rowColor}`}
              >
                <div className="flex items-center space-x-2 justify-start">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleComplete(task.id)}
                    className="form-checkbox h-5 w-5 accent-indigo-600"
                  />
                  <span
                    className={`truncate max-w-[180px] text-left ${
                      task.completed ? "line-through text-gray-400" : "text-gray-800"
                    }`}
                    title={task.text}
                  >
                    {task.text}
                  </span>
                </div>
  
                <div className="text-gray-700 text-sm">
                  {new Date(task.deadline).toLocaleDateString("id-ID")}
                </div>
  
                <div className="flex items-center justify-center gap-1 text-gray-700 text-sm">
                  <span>⏰</span>
                  <span>{formattedTime}</span>
                </div>
  
                <div className="text-right">
                  <button
                    onClick={() => editTask(task)}
                    className="text-indigo-600 hover:underline text-sm"
                  >
                    Edit
                  </button>
                </div>
  
                <div className="text-left">
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-red-500 hover:underline text-sm"
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
  );
}
