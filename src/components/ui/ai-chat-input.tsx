"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Lightbulb, Mic, Globe, Paperclip, Send } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"

const PLACEHOLDERS = [
  "How many orders are pending?",
  "Show orders sent to Steadfast",
  "What's the total revenue?",
  "Which orders have notes?",
  "Find cancelled orders",
  "Summarize today's orders",
]

interface AIChatInputProps {
  onSend?: (message: string) => void
  disabled?: boolean
}

const AIChatInput = ({ onSend, disabled }: AIChatInputProps) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const [isActive, setIsActive] = useState(false)
  const [thinkActive, setThinkActive] = useState(false)
  const [deepSearchActive, setDeepSearchActive] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isActive || inputValue) return

    const interval = setInterval(() => {
      setShowPlaceholder(false)
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length)
        setShowPlaceholder(true)
      }, 400)
    }, 3000)

    return () => clearInterval(interval)
  }, [isActive, inputValue])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        if (!inputValue) setIsActive(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [inputValue])

  const handleActivate = () => setIsActive(true)

  const handleSend = () => {
    if (!inputValue.trim() || disabled) return
    onSend?.(inputValue.trim())
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const containerVariants = {
    collapsed: {
      height: 68,
      boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)",
      transition: { type: "spring" as const, stiffness: 120, damping: 18 },
    },
    expanded: {
      height: 128,
      boxShadow: "0 8px 32px 0 rgba(0,0,0,0.16)",
      transition: { type: "spring" as const, stiffness: 120, damping: 18 },
    },
  }

  const placeholderContainerVariants = {
    initial: {},
    animate: { transition: { staggerChildren: 0.025 } },
    exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
  }

  const letterVariants = {
    initial: {
      opacity: 0,
      filter: "blur(12px)",
      y: 10,
    },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        opacity: { duration: 0.25 },
        filter: { duration: 0.4 },
        y: { type: "spring", stiffness: 80, damping: 20 },
      },
    },
    exit: {
      opacity: 0,
      filter: "blur(12px)",
      y: -10,
      transition: {
        opacity: { duration: 0.2 },
        filter: { duration: 0.3 },
        y: { type: "spring", stiffness: 80, damping: 20 },
      },
    },
  }

  return (
    <div className="w-full flex justify-center" ref={wrapperRef}>
      <motion.div
        className="w-full max-w-3xl rounded-2xl border border-black/[0.08] bg-white overflow-hidden"
        variants={containerVariants}
        initial="collapsed"
        animate={isActive ? "expanded" : "collapsed"}
        onClick={handleActivate}
        style={{ cursor: isActive ? "default" : "pointer" }}
      >
        <div className="flex flex-col h-full px-4">
          {/* Input Row */}
          <div className="flex items-center gap-2 h-[68px]">
            <button
              className="p-2 rounded-lg hover:bg-black/5 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Paperclip className="w-5 h-5 text-black/40" />
            </button>

            {/* Text Input & Placeholder */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 border-0 outline-0 rounded-md py-2 text-base bg-transparent w-full font-normal"
                style={{ position: "relative", zIndex: 1 }}
                onFocus={handleActivate}
              />
              <div className="absolute inset-0 flex items-center pointer-events-none">
                <AnimatePresence mode="wait">
                  {showPlaceholder && !isActive && !inputValue && (
                    <motion.span
                      key={placeholderIndex}
                      variants={placeholderContainerVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="text-black/30 text-base flex"
                    >
                      {PLACEHOLDERS[placeholderIndex]
                        .split("")
                        .map((char, i) => (
                          <motion.span key={i} variants={letterVariants}>
                            {char === " " ? "\u00A0" : char}
                          </motion.span>
                        ))}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button
              className="p-2 rounded-lg hover:bg-black/5 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Mic className="w-5 h-5 text-black/40" />
            </button>
            <button
              className={cn(
                "p-2 rounded-lg transition-colors",
                inputValue.trim() && !disabled
                  ? "bg-black text-white hover:bg-black/80"
                  : "bg-black/5 text-black/20"
              )}
              onClick={(e) => {
                e.stopPropagation()
                handleSend()
              }}
              disabled={!inputValue.trim() || disabled}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Expanded Controls */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 pb-3"
              >
                {/* Think Toggle */}
                <motion.button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    thinkActive
                      ? "bg-amber-100 text-amber-700"
                      : "bg-black/5 text-black/50 hover:bg-black/10"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setThinkActive((a) => !a)
                  }}
                >
                  <Lightbulb className="w-4 h-4" />
                  Think
                </motion.button>

                {/* Deep Search Toggle */}
                <motion.button
                  className={cn(
                    "flex items-center gap-1.5 rounded-full text-sm font-medium transition-colors overflow-hidden py-1.5",
                    deepSearchActive
                      ? "bg-blue-100 text-blue-700"
                      : "bg-black/5 text-black/50 hover:bg-black/10"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeepSearchActive((a) => !a)
                  }}
                  initial={false}
                  animate={{
                    width: deepSearchActive ? 125 : 36,
                    paddingLeft: deepSearchActive ? 8 : 9,
                    paddingRight: deepSearchActive ? 12 : 9,
                  }}
                >
                  <span className="shrink-0">
                    <Globe className="w-4 h-4" />
                  </span>
                  <AnimatePresence>
                    {deepSearchActive && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="whitespace-nowrap"
                      >
                        Deep Search
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export { AIChatInput }
