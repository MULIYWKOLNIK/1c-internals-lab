import { lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider } from '@/state/store'
import { Layout } from '@/components/Layout'
import Home from '@/pages/Home'

/**
 * Розділи вантажаться окремими чанками: головна сторінка відкривається
 * швидко, решта підвантажується за потреби.
 */
const Basics = lazy(() => import('@/pages/Basics'))
const Architecture = lazy(() => import('@/pages/Architecture'))
const RegisterIntro = lazy(() => import('@/pages/RegisterIntro'))
const Dimensions = lazy(() => import('@/pages/Dimensions'))
const Accumulation = lazy(() => import('@/pages/Accumulation'))
const Information = lazy(() => import('@/pages/Information'))
const AccountingRegister = lazy(() => import('@/pages/AccountingRegister'))
const Posting = lazy(() => import('@/pages/Posting'))
const Movements = lazy(() => import('@/pages/Movements'))
const DocToRegister = lazy(() => import('@/pages/DocToRegister'))
const Expenses = lazy(() => import('@/pages/Expenses'))
const ExpenseCases = lazy(() => import('@/pages/ExpenseCases'))
const Corrections = lazy(() => import('@/pages/Corrections'))
const RegisterToReport = lazy(() => import('@/pages/RegisterToReport'))
const Lms = lazy(() => import('@/pages/Lms'))
const Ledger = lazy(() => import('@/pages/Ledger'))
const DebugMode = lazy(() => import('@/pages/DebugMode'))
const Diagnostics = lazy(() => import('@/pages/Diagnostics'))
const Quiz = lazy(() => import('@/pages/Quiz'))
const Glossary = lazy(() => import('@/pages/Glossary'))
const BigMap = lazy(() => import('@/pages/BigMap'))

export default function App() {
  return (
    <StoreProvider>
      <HashRouter future={{ v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/basics" element={<Basics />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="/register" element={<RegisterIntro />} />
            <Route path="/dimensions" element={<Dimensions />} />
            <Route path="/accumulation" element={<Accumulation />} />
            <Route path="/information" element={<Information />} />
            <Route path="/accounting-register" element={<AccountingRegister />} />
            <Route path="/posting" element={<Posting />} />
            <Route path="/movements" element={<Movements />} />
            <Route path="/doc-to-register" element={<DocToRegister />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expense-cases" element={<ExpenseCases />} />
            <Route path="/corrections" element={<Corrections />} />
            <Route path="/register-to-report" element={<RegisterToReport />} />
            <Route path="/lms" element={<Lms />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/debug" element={<DebugMode />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/map" element={<BigMap />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
