import { EventEmitter } from "events"
import { waitSubscribersExecution } from "../events"

// Mock the IEventBusModuleService
class MockEventBus {
  public eventEmitter_: EventEmitter

  constructor() {
    this.eventEmitter_ = new EventEmitter()
  }

  emit(eventName: string, data?: any) {
    this.eventEmitter_.emit(eventName, data)
    return Promise.resolve()
  }
}

describe("waitSubscribersExecution", () => {
  let eventBus: MockEventBus
  const TEST_EVENT = "test-event"

  beforeEach(() => {
    eventBus = new MockEventBus()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("with no existing listeners", () => {
    it("should resolve when event is fired before timeout", async () => {
      const waitPromise = waitSubscribersExecution(TEST_EVENT, eventBus as any)
      setTimeout(() => eventBus.emit(TEST_EVENT, "test-data"), 100)

      jest.advanceTimersByTime(100)

      await expect(waitPromise).resolves.toEqual(["test-data"])
    })

    it("should reject when timeout is reached before event is fired", async () => {
      const waitPromise = waitSubscribersExecution(TEST_EVENT, eventBus as any)

      jest.advanceTimersByTime(5100)

      await expect(waitPromise).rejects.toThrow(
        `Timeout of 5000ms exceeded while waiting for event "${TEST_EVENT}"`
      )
    })

    it("should respect custom timeout value", async () => {
      const customTimeout = 2000
      const waitPromise = waitSubscribersExecution(
        TEST_EVENT,
        eventBus as any,
        {
          timeout: customTimeout,
        }
      )

      jest.advanceTimersByTime(customTimeout + 100)

      await expect(waitPromise).rejects.toThrow(
        `Timeout of ${customTimeout}ms exceeded while waiting for event "${TEST_EVENT}"`
      )
    })
  })

  describe("with existing listeners", () => {
    it("should resolve when all listeners complete successfully", async () => {
      const listener = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 200))
      })

      eventBus.eventEmitter_.on(TEST_EVENT, listener)

      // Setup the promise
      const waitPromise = waitSubscribersExecution(TEST_EVENT, eventBus as any)

      // Emit the event
      eventBus.emit(TEST_EVENT, "test-data")

      // Fast forward to let the listener complete
      jest.advanceTimersByTime(300)

      // Await the promise - it should resolve
      await expect(waitPromise).resolves.not.toThrow()

      // Ensure the listener was called
      expect(listener).toHaveBeenCalledWith("test-data")
    })

    it("should reject when a listener throws an error", async () => {
      const errorMessage = "Test error from listener"

      const listener = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error(errorMessage))
      })

      eventBus.eventEmitter_.on(TEST_EVENT, listener)

      const waitPromise = waitSubscribersExecution(TEST_EVENT, eventBus as any)

      eventBus.emit(TEST_EVENT, "test-data")

      await expect(waitPromise).rejects.toThrow(errorMessage)
    })

    it("should reject with timeout if event is not fired in time", async () => {
      const listener = jest.fn()
      eventBus.eventEmitter_.on(TEST_EVENT, listener)

      const waitPromise = waitSubscribersExecution(
        TEST_EVENT,
        eventBus as any,
        {
          timeout: 1000,
        }
      )

      jest.advanceTimersByTime(1100)

      await expect(waitPromise).rejects.toThrow(
        `Timeout of 1000ms exceeded while waiting for event "${TEST_EVENT}"`
      )

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe("with multiple listeners", () => {
    it("should resolve when all listeners complete", async () => {
      const listener1 = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 100))
      })

      const listener2 = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 200))
      })

      const listener3 = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 300))
      })

      eventBus.eventEmitter_.on(TEST_EVENT, listener1)
      eventBus.eventEmitter_.on(TEST_EVENT, listener2)
      eventBus.eventEmitter_.on(TEST_EVENT, listener3)

      const waitPromise = waitSubscribersExecution(TEST_EVENT, eventBus as any)

      eventBus.emit(TEST_EVENT, "test-data")

      jest.advanceTimersByTime(400)

      await expect(waitPromise).resolves.not.toThrow()

      expect(listener1).toHaveBeenCalledWith("test-data")
      expect(listener2).toHaveBeenCalledWith("test-data")
      expect(listener3).toHaveBeenCalledWith("test-data")
    })

    it("should reject if any listener throws an error", async () => {
      const errorMessage = "Test error from listener 2"

      const listener1 = jest.fn().mockImplementation(() => {
        return Promise.resolve()
      })

      const listener2 = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error(errorMessage))
      })

      const listener3 = jest.fn().mockImplementation(() => {
        return Promise.resolve()
      })

      eventBus.eventEmitter_.on(TEST_EVENT, listener1)
      eventBus.eventEmitter_.on(TEST_EVENT, listener2)
      eventBus.eventEmitter_.on(TEST_EVENT, listener3)

      const waitPromise = waitSubscribersExecution(TEST_EVENT, eventBus as any)

      eventBus.emit(TEST_EVENT, "test-data")

      await expect(waitPromise).rejects.toThrow(errorMessage)
    })
  })

  describe("cleanup", () => {
    it("should restore original listeners after completion", async () => {
      const originalListener = jest.fn()
      eventBus.eventEmitter_.on(TEST_EVENT, originalListener)

      const listenersBefore =
        eventBus.eventEmitter_.listeners(TEST_EVENT).length

      const waitPromise = waitSubscribersExecution(TEST_EVENT, eventBus as any)

      eventBus.emit(TEST_EVENT, "test-data")

      await waitPromise

      const listenersAfter = eventBus.eventEmitter_.listeners(TEST_EVENT).length
      expect(listenersAfter).toBe(listenersBefore)

      eventBus.emit(TEST_EVENT, "after-test-data")
      expect(originalListener).toHaveBeenCalledWith("after-test-data")
    })

    it("should restore original listeners after timeout", async () => {
      const originalListener = jest.fn()
      eventBus.eventEmitter_.on(TEST_EVENT, originalListener)

      const listenersBefore =
        eventBus.eventEmitter_.listeners(TEST_EVENT).length

      const waitPromise = waitSubscribersExecution(
        TEST_EVENT,
        eventBus as any,
        {
          timeout: 500,
        }
      )

      jest.advanceTimersByTime(600)

      await waitPromise.catch(() => {})

      const listenersAfter = eventBus.eventEmitter_.listeners(TEST_EVENT).length
      expect(listenersAfter).toBe(listenersBefore)

      eventBus.emit(TEST_EVENT, "after-timeout-data")
      expect(originalListener).toHaveBeenCalledWith("after-timeout-data")
    })
  })

  describe("timeout clearing", () => {
    it("should clear timeout when events fire", async () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout")

      const waitPromise = waitSubscribersExecution(TEST_EVENT, eventBus as any)

      eventBus.emit(TEST_EVENT, "test-data")

      await waitPromise

      expect(clearTimeoutSpy).toHaveBeenCalled()
      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })
  })
})
