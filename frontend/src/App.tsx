import { useEffect, useState } from "react"
import "./App.css"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface Person {
  person_id: number
  name: string
  contact?: string
}

interface Transaction {
  transaction_id: number
  person_id: number
  people?: { name: string }
  person_name?: string
  amount: number
  is_give: boolean
  payment_mode: string
  reason: string
  transaction_date: string
}

function App() {
  // State variables
  const [people, setPeople] = useState<Person[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Person form state
  const [personName, setPersonName] = useState("")
  const [personContact, setPersonContact] = useState("")
  const [personId, setPersonId] = useState("")

  // Transaction form state
  const [selectedPersonId, setSelectedPersonId] = useState("")
  const [amount, setAmount] = useState("")
  const [isGive, setIsGive] = useState(true)
  const [paymentMode, setPaymentMode] = useState("")
  const [reason, setReason] = useState("")
  const [transactionId, setTransactionId] = useState("")

  // Add these state variables after the existing state declarations
  const [sortField, setSortField] = useState<keyof Transaction | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>("")
  // Add new state for transaction type filter
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>("all")

  // Fetch people and transactions on load
  useEffect(() => {
    // Fetch people
    fetch("http://localhost:3000/people")
      .then((response) => response.json())
      .then((data) => {
        console.log("People data:", data)
        setPeople(data)
      })
      .catch((error) => console.error("Error fetching people:", error))

    // Fetch transactions
    fetch("http://localhost:3000/transactions")
      .then((response) => response.json())
      .then((data) => {
        console.log("Transaction data:", data)
        // Process transactions to ensure person_name is available
        const processedData = data.map((transaction: Transaction) => {
          // If person_name is already provided by the backend, use it
          if (transaction.person_name) {
            return transaction
          }

          // Otherwise, try to extract it from the people object
          if (transaction.people && transaction.people.name) {
            return {
              ...transaction,
              person_name: transaction.people.name,
            }
          }

          // If neither is available, find the person in our people state
          const person = people.find((p) => p.person_id === transaction.person_id)
          return {
            ...transaction,
            person_name: person ? person.name : "Unknown",
          }
        })

        setTransactions(processedData)
      })
      .catch((error) => console.error("Error fetching transactions:", error))
  }, [])

  // PERSON HANDLERS

  const handleAddPerson = async () => {
    if (personName === "") {
      alert("Please enter a name for the person")
      return
    }

    try {
      const response = await fetch("http://localhost:3000/createPerson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: personName,
          contact: personContact,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong")
      }

      console.log("Server Response:", data)
      alert("Person added successfully!")

      // Reset form fields
      setPersonName("")
      setPersonContact("")

      // Refresh data
      window.location.reload()
    } catch (error: any) {
      console.error("Error:", error)
      alert(error.message)
    }
  }

  const handleDeletePerson = async () => {
    if (personId === "") {
      alert("Please enter the ID of the person you want to delete")
      return
    }

    try {
      const response = await fetch(`http://localhost:3000/deletePerson/${personId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete person")
      }

      alert("Person deleted successfully!")
      window.location.reload()
    } catch (error: any) {
      console.error("Error:", error)
      alert(error.message)
    }
  }

  // TRANSACTION HANDLERS

  const handleAddTransaction = async () => {
    if (selectedPersonId === "" || amount === "" || paymentMode === "") {
      alert("Please fill in all required fields")
      return
    }

    try {
      const response = await fetch("http://localhost:3000/createTransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: Number.parseInt(selectedPersonId),
          amount: Number.parseFloat(amount),
          is_give: isGive,
          payment_mode: paymentMode,
          reason: reason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong")
      }

      console.log("Server Response:", data)
      alert("Transaction added successfully!")

      // Reset form fields
      setSelectedPersonId("")
      setAmount("")
      setPaymentMode("")
      setReason("")

      // Refresh data
      window.location.reload()
    } catch (error: any) {
      console.error("Error:", error)
      alert(error.message)
    }
  }

  const handleDeleteTransaction = async () => {
    if (transactionId === "") {
      alert("Please enter the ID of the transaction you want to delete")
      return
    }

    try {
      const response = await fetch(`http://localhost:3000/deleteTransaction/${transactionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete transaction")
      }

      alert("Transaction deleted successfully!")
      window.location.reload()
    } catch (error: any) {
      console.error("Error:", error)
      alert(error.message)
    }
  }

  // Add this function before the return statement
  const handleSort = (field: keyof Transaction) => {
    // Skip sorting for reason and payment_mode
    if (field === "reason" || field === "payment_mode") return

    // If clicking the same field, toggle direction
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // New field, set it and default to ascending
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Update this function to include the transaction type filter
  const getSortedTransactions = () => {
    // First filter by person if applicable
    let filteredTransactions = selectedPersonFilter
      ? transactions.filter((t) => t.person_name === selectedPersonFilter)
      : transactions

    // Then filter by transaction type if applicable
    if (transactionTypeFilter === "give") {
      filteredTransactions = filteredTransactions.filter((t) => t.is_give)
    } else if (transactionTypeFilter === "take") {
      filteredTransactions = filteredTransactions.filter((t) => !t.is_give)
    }

    if (!sortField) return filteredTransactions

    return [...filteredTransactions].sort((a, b) => {
      if (sortField === "transaction_date") {
        const dateA = new Date(a[sortField]).getTime()
        const dateB = new Date(b[sortField]).getTime()
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA
      }

      if (sortField === "amount") {
        const amountA = a[sortField]
        const amountB = b[sortField]
        return sortDirection === "asc" ? amountA - amountB : amountB - amountA
      }

      if (sortField === "is_give") {
        return sortDirection === "asc" ? (a[sortField] ? 1 : -1) : a[sortField] ? -1 : 1
      }

      // For numeric fields
      const valA: any = a[sortField]
      const valB: any = b[sortField]
      return sortDirection === "asc" ? valA - valB : valB - valA
    })
  }

  const calculateTotalSum = () => {
    const filteredTransactions = getSortedTransactions()
    return filteredTransactions.reduce((total, transaction) => {
      // Ensure amount is a valid number
      const amount = Number.parseFloat(transaction.amount.toString())
      if (isNaN(amount)) {
        return total // Skip this transaction if amount is not a valid number
      }
      // Add to total if it's a "take" transaction, subtract if it's a "give" transaction
      return total + (transaction.is_give ? -amount : amount)
    }, 0)
  }

  const exportToPDF = () => {
    // Initialize jsPDF
    const doc = new jsPDF()

    // Add title
    doc.setFontSize(18)
    doc.text("Financial Transaction Tracker", 14, 22)
    doc.setFontSize(11)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30)

    // Transactions Table
    doc.setFontSize(14)
    doc.text("Transactions", 14, 40)

    // Prepare data with custom styling
    const tableData = getSortedTransactions().map((transaction) => {
      const isNegative = transaction.is_give
      return {
        id: transaction.transaction_id,
        person: transaction.person_name || "Unknown",
        amount: `${transaction.is_give ? "-" : "+"}${transaction.amount}`,
        mode: transaction.payment_mode,
        reason: transaction.reason || "-",
        date: new Date(transaction.transaction_date).toLocaleString(),
        isNegative: isNegative, // Add this flag for styling
      }
    })

    // Create the table
    autoTable(doc, {
      startY: 45,
      head: [["ID", "Person", "Amount", "Mode", "Reason", "Date"]],
      body: tableData.map((row) => [row.id, row.person, row.amount, row.mode, row.reason, row.date]),
      styles: {
        cellPadding: 3,
      },
      didDrawCell: (data) => {
        // Apply text color based on the amount column (index 2)
        if (data.section === "body" && data.column.index === 2) {
          const rowIndex = data.row.index
          const isNegative = tableData[rowIndex].isNegative

          // Save current fill style
          const currentFillStyle = doc.getFillColor()

          // Set text color
          if (isNegative) {
            doc.setTextColor(255, 0, 0) // Red for negative
          } else {
            doc.setTextColor(0, 128, 0) // Green for positive
          }

          // Reset text color for next cells
          doc.setTextColor(0) // Reset to black

          // Restore fill style
          doc.setFillColor(currentFillStyle)
        }
      },
    })

    // Save the PDF
    doc.save("financial-tracker.pdf")
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-800">Transaction Manager</h1>
        <button
          onClick={exportToPDF}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
        >
          Export to PDF
        </button>
      </div>

      <div className="mb-12 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 border-b pb-2">People</h2>

        {/* People Table */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full bg-white border border-gray-300 rounded-md">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left font-medium text-gray-700 border-b">P_ID</th>
                <th className="py-3 px-4 text-left font-medium text-gray-700 border-b">Name</th>
                <th className="py-3 px-4 text-left font-medium text-gray-700 border-b">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {people.map((person) => (
                <tr key={person.person_id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 text-gray-700">{person.person_id}</td>
                  <td className="py-2 px-4 text-gray-700">{person.name}</td>
                  <td className="py-2 px-4 text-gray-700">{person.contact || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* People Form */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-lg font-medium mb-3 text-gray-700">Add Person</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={personContact}
                onChange={(e) => setPersonContact(e.target.value)}
                placeholder="Contact (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddPerson}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Person
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-lg font-medium mb-3 text-gray-700">Delete Person</h3>
            <div className="space-y-3">
              <input
                type="number"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                placeholder="Person ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleDeletePerson}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete Person
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 border-b pb-2">Transactions</h2>

        {/* Transaction Form */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-lg font-medium mb-3 text-gray-700">Add Transaction</h3>
            <div className="space-y-3">
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Person</option>
                {people.map((person) => (
                  <option key={person.person_id} value={person.person_id}>
                    {person.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex items-center space-x-6 p-2 bg-white rounded-md border border-gray-300">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={isGive}
                    onChange={() => setIsGive(true)}
                    className="form-radio h-5 w-5 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">Give</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={!isGive}
                    onChange={() => setIsGive(false)}
                    className="form-radio h-5 w-5 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">Take</span>
                </label>
              </div>

              <input
                type="text"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                placeholder="Payment Mode"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              />

              <button
                onClick={handleAddTransaction}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Transaction
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-lg font-medium mb-3 text-gray-700">Delete Transaction</h3>
            <div className="space-y-3">
              <input
                type="number"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Transaction ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleDeleteTransaction}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete Transaction
              </button>
            </div>
          </div>
        </div>
        <div className="text-2xl font-semibold mb-4 text-gray-800 border-b pb-2"></div>
        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Filter by person */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Person:</label>
            <select
              value={selectedPersonFilter}
              onChange={(e) => setSelectedPersonFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All People</option>
              {Array.from(new Set(transactions.map((t) => t.person_name)))
                .filter(Boolean)
                .map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
          </div>

          {/* Filter by transaction type (Give/Take) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type:</label>
            <select
              value={transactionTypeFilter}
              onChange={(e) => setTransactionTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Transactions</option>
              <option value="give">Give (Outgoing)</option>
              <option value="take">Take (Incoming)</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full bg-white border border-gray-300 rounded-md">
            <thead className="bg-gray-100">
              <tr>
                <th
                  className="py-3 px-4 text-left font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("transaction_id")}
                >
                  T_ID {sortField === "transaction_id" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th className="py-3 px-4 text-left font-medium text-gray-700 border-b">Person</th>
                <th
                  className="py-3 px-4 text-left font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("amount")}
                >
                  Amount {sortField === "amount" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th className="py-3 px-4 text-left font-medium text-gray-700 border-b">Mode</th>
                <th className="py-3 px-4 text-left font-medium text-gray-700 border-b">Reason</th>
                <th
                  className="py-3 px-4 text-left font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("transaction_date")}
                >
                  Date {sortField === "transaction_date" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getSortedTransactions().map((transaction) => (
                <tr key={transaction.transaction_id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 text-gray-700">{transaction.transaction_id}</td>
                  <td className="py-2 px-4 text-gray-700">{transaction.person_name || "Unknown"}</td>
                  <td className={`py-2 px-4 font-medium ${transaction.is_give ? "text-red-600" : "text-green-600"}`}>
                    {transaction.is_give ? "-" : "+"}₹{transaction.amount}
                  </td>
                  <td className="py-2 px-4 text-gray-700">{transaction.payment_mode}</td>
                  <td className="py-2 px-4 text-gray-700">{transaction.reason || "-"}</td>
                  <td className="py-2 px-4 text-gray-700">{new Date(transaction.transaction_date).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td colSpan={2} className="py-3 px-4 text-right text-gray-700 border-t">
                  Total:
                </td>
                <td
                  className={`py-3 px-4 font-medium border-t ${calculateTotalSum() >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {isNaN(calculateTotalSum())
                    ? "₹0.00"
                    : `${calculateTotalSum() >= 0 ? "+" : ""}₹${Math.abs(calculateTotalSum()).toFixed(2)}`}
                </td>
                <td colSpan={3} className="border-t"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default App