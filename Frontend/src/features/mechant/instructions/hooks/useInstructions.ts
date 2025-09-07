// src/features/mechant/instructions/hooks/useInstructions.ts
import { useState, useEffect, useCallback } from 'react';
import {
  listInstructions, createInstruction, updateInstruction, removeInstruction,
  toggleActive, getSuggestions, generateFromBadReplies
} from '../api';
import type { Instruction, Suggestion } from '../type';

export const useInstructions = () => {
  const [rows, setRows] = useState<Instruction[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters and Pagination State
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');

  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null);

  // Suggestion Dialog State
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [_selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());

  // Fetching Logic
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit, active: activeFilter };
      // نفترض أن الـ API function تقوم بتوحيد شكل الرد
      const response = await listInstructions(params); 
      setRows(response || []);
      setTotalRows(response?.length || 0);
    } catch (error) {
      console.error('Error fetching instructions:', error);
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, activeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleOpenNew = () => {
    setEditingInstruction(null);
    setEditDialogOpen(true);
  };
  
  const handleOpenEdit = (instruction: Instruction) => {
    setEditingInstruction(instruction);
    setEditDialogOpen(true);
  };

  const handleSave = async (text: string) => {
    if (editingInstruction) {
      await updateInstruction(editingInstruction._id, { instruction: text });
    } else {
      await createInstruction({ instruction: text, type: 'manual' });
    }
    setEditDialogOpen(false);
    fetchData(); // Refresh data
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا التوجيه؟')) {
      await removeInstruction(id);
      fetchData();
    }
  };

  const handleToggleActive = async (instruction: Instruction) => {
    await toggleActive(instruction._id, !instruction.active);
    fetchData();
  };
  
  const handleOpenSuggest = async () => {
    setSuggestDialogOpen(true);
    setSelectedSuggestions(new Set());
    const data = await getSuggestions(10);
    setSuggestions(data.items || []);
  };

  const handleSaveSuggestions = async (selectedIndexes: Set<number>) => {
    const badReplies = Array.from(selectedIndexes).map(i => suggestions[i].badReply);
    if (badReplies.length > 0) {
      await generateFromBadReplies(badReplies);
    }
    setSuggestDialogOpen(false);
    fetchData();
  };

  return {
    // State
    rows,
    totalRows,
    loading,
    page,
    limit,
    activeFilter,
    editDialogOpen,
    editingInstruction,
    suggestDialogOpen,
    suggestions,
    // Setters & Handlers
    setPage,
    setLimit,
    setActiveFilter,
    setEditDialogOpen,
    setSuggestDialogOpen,
    handleOpenNew,
    handleOpenEdit,
    handleSave,
    handleDelete,
    handleToggleActive,
    handleOpenSuggest,
    handleSaveSuggestions
  };
};