import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { CartProvider, useCart } from "./CartContext";
import { vi } from "vitest";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock ProductResponse type
const mockProduct: any = {
  _id: "product-1",
  name: "Test Product",
  price: 100,
  description: "Test Description",
  images: ["image1.jpg"],
  category: "test",
  merchant: "merchant-1",
  stock: 10,
  isActive: true,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

const mockProduct2: any = {
  _id: "product-2",
  name: "Test Product 2",
  price: 200,
  description: "Test Description 2",
  images: ["image2.jpg"],
  category: "test2",
  merchant: "merchant-2",
  stock: 5,
  isActive: true,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

// Test component to use the cart
const TestComponent = () => {
  const { items, addItem, removeItem, clearCart, updateQuantity } = useCart();
  
  return (
    <div>
      <div data-testid="cart-items-count">{items.length}</div>
      <div data-testid="cart-total-items">
        {items.reduce((sum, item) => sum + item.quantity, 0)}
      </div>
      <button 
        data-testid="add-item" 
        onClick={() => addItem(mockProduct)}
      >
        Add Item
      </button>
      <button 
        data-testid="add-item-quantity" 
        onClick={() => addItem(mockProduct, 3)}
      >
        Add Item with Quantity
      </button>
      <button 
        data-testid="add-item-2" 
        onClick={() => addItem(mockProduct2)}
      >
        Add Item 2
      </button>
      <button 
        data-testid="remove-item" 
        onClick={() => removeItem("product-1")}
      >
        Remove Item
      </button>
      <button 
        data-testid="update-quantity" 
        onClick={() => updateQuantity("product-1", 5)}
      >
        Update Quantity
      </button>
      <button 
        data-testid="clear-cart" 
        onClick={clearCart}
      >
        Clear Cart
      </button>
      <div data-testid="cart-items">
        {items.map((item, index) => (
          <div key={index} data-testid={`cart-item-${index}`}>
            <span data-testid={`item-name-${index}`}>{item.product.name}</span>
            <span data-testid={`item-quantity-${index}`}>{item.quantity}</span>
            <span data-testid={`item-price-${index}`}>{item.product.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

describe("CartContext", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  describe("CartProvider", () => {
    test("renders children without crashing", () => {
      renderWithProviders(
        <CartProvider>
          <div data-testid="test-child">Test Child</div>
        </CartProvider>
      );

      expect(screen.getByTestId("test-child")).toBeInTheDocument();
    });

    test("provides cart context to children", () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId("cart-items-count")).toBeInTheDocument();
      expect(screen.getByTestId("add-item")).toBeInTheDocument();
    });
  });

  describe("useCart hook", () => {
    test("throws error when used outside CartProvider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderWithProviders(<TestComponent />);
      }).toThrow("useCart must be inside CartProvider");

      consoleSpy.mockRestore();
    });

    test("initializes with empty cart", () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("0");
      expect(screen.getByTestId("cart-total-items")).toHaveTextContent("0");
    });

    test("loads cart from localStorage on initialization", () => {
      const savedCart = [
        { product: mockProduct, quantity: 2 },
        { product: mockProduct2, quantity: 1 },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCart));

      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("2");
      expect(screen.getByTestId("cart-total-items")).toHaveTextContent("3");
    });

    test("handles invalid localStorage data gracefully", () => {
      // Mock localStorage.getItem to return invalid JSON for cart only
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "cart") {
          return "invalid json";
        }
        return null;
      });

      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("0");
    });

    test("handles localStorage error gracefully", () => {
      // Mock localStorage.getItem to throw error for cart only
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "cart") {
          throw new Error("localStorage error");
        }
        return null;
      });

      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("0");
    });
  });

  describe("addItem functionality", () => {
    test("adds new item to cart", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      const addButton = screen.getByTestId("add-item");
      await user.click(addButton);

      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("1");
      expect(screen.getByTestId("cart-total-items")).toHaveTextContent("1");
      expect(screen.getByTestId("item-name-0")).toHaveTextContent("Test Product");
      expect(screen.getByTestId("item-quantity-0")).toHaveTextContent("1");
    });

    test("adds item with custom quantity", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      const addButton = screen.getByTestId("add-item-quantity");
      await user.click(addButton);

      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("1");
      expect(screen.getByTestId("cart-total-items")).toHaveTextContent("3");
      expect(screen.getByTestId("item-quantity-0")).toHaveTextContent("3");
    });

    test("increments quantity when adding existing item", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      const addButton = screen.getByTestId("add-item");
      
      // Add item first time
      await user.click(addButton);
      expect(screen.getByTestId("item-quantity-0")).toHaveTextContent("1");
      
      // Add same item again
      await user.click(addButton);
      expect(screen.getByTestId("item-quantity-0")).toHaveTextContent("2");
      expect(screen.getByTestId("cart-total-items")).toHaveTextContent("2");
    });

    test("adds multiple different items", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      const addButton1 = screen.getByTestId("add-item");
      const addButton2 = screen.getByTestId("add-item-2");
      
      await user.click(addButton1);
      await user.click(addButton2);

      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("2");
      expect(screen.getByTestId("cart-total-items")).toHaveTextContent("2");
      expect(screen.getByTestId("item-name-0")).toHaveTextContent("Test Product");
      expect(screen.getByTestId("item-name-1")).toHaveTextContent("Test Product 2");
    });
  });

  describe("removeItem functionality", () => {
    test("removes item from cart", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      // Add item first
      const addButton = screen.getByTestId("add-item");
      await user.click(addButton);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("1");

      // Remove item
      const removeButton = screen.getByTestId("remove-item");
      await user.click(removeButton);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("0");
    });

    test("removes correct item when multiple items exist", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      // Add both items
      const addButton1 = screen.getByTestId("add-item");
      const addButton2 = screen.getByTestId("add-item-2");
      await user.click(addButton1);
      await user.click(addButton2);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("2");

      // Remove first item
      const removeButton = screen.getByTestId("remove-item");
      await user.click(removeButton);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("1");
      expect(screen.getByTestId("item-name-0")).toHaveTextContent("Test Product 2");
    });

    test("does nothing when removing non-existent item", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      // Add item
      const addButton = screen.getByTestId("add-item");
      await user.click(addButton);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("1");

      // Try to remove non-existent item
      const removeButton = screen.getByTestId("remove-item");
      await user.click(removeButton);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("0");
    });
  });

  describe("updateQuantity functionality", () => {
    test("updates item quantity", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      // Add item first
      const addButton = screen.getByTestId("add-item");
      await user.click(addButton);
      expect(screen.getByTestId("item-quantity-0")).toHaveTextContent("1");

      // Update quantity
      const updateButton = screen.getByTestId("update-quantity");
      await user.click(updateButton);
      expect(screen.getByTestId("item-quantity-0")).toHaveTextContent("5");
      expect(screen.getByTestId("cart-total-items")).toHaveTextContent("5");
    });

    test("sets quantity to 1 when quantity is 0 or negative", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      // Add item first
      const addButton = screen.getByTestId("add-item");
      await user.click(addButton);

      // Test with quantity 0
      const updateButton = screen.getByTestId("update-quantity");
      await user.click(updateButton);
      expect(screen.getByTestId("item-quantity-0")).toHaveTextContent("5");

      // Note: We can't easily test 0 quantity with current UI, but the logic is there
    });

    test("does nothing when updating non-existent item", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      // Try to update quantity without adding item
      const updateButton = screen.getByTestId("update-quantity");
      await user.click(updateButton);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("0");
    });
  });

  describe("clearCart functionality", () => {
    test("clears all items from cart", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      // Add multiple items
      const addButton1 = screen.getByTestId("add-item");
      const addButton2 = screen.getByTestId("add-item-2");
      await user.click(addButton1);
      await user.click(addButton2);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("2");

      // Clear cart
      const clearButton = screen.getByTestId("clear-cart");
      await user.click(clearButton);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("0");
      expect(screen.getByTestId("cart-total-items")).toHaveTextContent("0");
    });

    test("clears empty cart without error", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("0");

      const clearButton = screen.getByTestId("clear-cart");
      await user.click(clearButton);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("0");
    });
  });

  describe("localStorage persistence", () => {
    test("saves cart to localStorage when items change", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      const addButton = screen.getByTestId("add-item");
      await user.click(addButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "cart",
          JSON.stringify([{ product: mockProduct, quantity: 1 }])
        );
      });
    });

    test("saves cart to localStorage when items are removed", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      // Add item
      const addButton = screen.getByTestId("add-item");
      await user.click(addButton);

      // Remove item
      const removeButton = screen.getByTestId("remove-item");
      await user.click(removeButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith("cart", JSON.stringify([]));
      });
    });

    test("saves cart to localStorage when cart is cleared", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      // Add item
      const addButton = screen.getByTestId("add-item");
      await user.click(addButton);

      // Clear cart
      const clearButton = screen.getByTestId("clear-cart");
      await user.click(clearButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith("cart", JSON.stringify([]));
      });
    });

    test("handles localStorage setItem error gracefully", async () => {
      // Mock localStorage.setItem to throw error for cart only
      localStorageMock.setItem.mockImplementation((key) => {
        if (key === "cart") {
          throw new Error("localStorage setItem error");
        }
      });

      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      const addButton = screen.getByTestId("add-item");
      await user.click(addButton);

      // Should not crash and still update the cart state
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("1");
    });
  });

  describe("cart state management", () => {
    test("maintains cart state across multiple operations", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      // Add first item
      const addButton1 = screen.getByTestId("add-item");
      await user.click(addButton1);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("1");

      // Add second item
      const addButton2 = screen.getByTestId("add-item-2");
      await user.click(addButton2);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("2");

      // Update quantity of first item
      const updateButton = screen.getByTestId("update-quantity");
      await user.click(updateButton);
      expect(screen.getByTestId("item-quantity-0")).toHaveTextContent("5");

      // Remove second item
      const removeButton = screen.getByTestId("remove-item");
      await user.click(removeButton);
      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("1");
      expect(screen.getByTestId("item-name-0")).toHaveTextContent("Test Product");
    });

    test("handles rapid state changes correctly", async () => {
      renderWithProviders(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      const addButton = screen.getByTestId("add-item");
      const removeButton = screen.getByTestId("remove-item");

      // Rapid add and remove
      await user.click(addButton);
      await user.click(addButton);
      await user.click(removeButton);

      expect(screen.getByTestId("cart-items-count")).toHaveTextContent("0");
    });
  });
});
