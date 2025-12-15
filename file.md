# All Formulas (Simulation & Modeling)

> Save this file as: `all_formulas.md` [file:1][file:2][file:3][file:4]

---

## Queuing system fundamentals (single-server formulas)

- λ = arrival rate  // Average number of arrivals per unit time (input to the queue). [file:1]
- μ = service rate (departure rate)  // Average number of services completed per unit time (capacity of the server). [file:1]

- Ls = λ / (μ − λ)  // Expected number of customers in the entire system (queue + service). [file:1]
- Lq = λ² / ( μ (μ − λ) )  // Expected number of customers waiting in the queue only. [file:1]
- Ws = 1 / (μ − λ)  // Expected time a customer spends in the system (waiting + service). [file:1]
- Wq = λ / ( μ (μ − λ) )  // Expected time a customer spends waiting in the queue (before service starts). [file:1]

- R = (λ / μ) * 100  // Server utilization percentage (how busy the server is). [file:1]
- P0 = 100 − R  // Probability (%) that there are no customers in the system (idle server). [file:1]
- Pn = (R^n) * (1 − R)  // Probability of having n customers in the system (as presented in the notes). [file:1]

---

## Queuing system cost model

- T.C. = C1 * C + C2 * Ls  // Total cost = server cost + customer waiting/system cost. [file:1]
- C1 = cost of one server  // Cost per server (resource cost). [file:1]
- C = number of servers  // How many parallel servers are used. [file:1]
- C2 = waiting cost factor  // Cost per customer (waiting/system congestion cost). [file:1]
- Ls = average number in system  // Used as the congestion measure inside the cost formula. [file:1]

---

## Multi-server queue (structure & distributions)

- (a/b/c)(d/e/f)  // Queueing model notation: arrival dist / service dist / number of servers, then discipline / system capacity / calling population. [file:1]
- c = number of parallel servers  // Number of channels operating in parallel in the facility. [file:2]

---

## Discrete-event queue simulation (table “mesh” calculations)

> These are the exact calculations used when building the simulation table by meshing clock, arrivals, and service times. [file:1][file:2]

- ArrivalTime[i] = ArrivalTime[i−1] + InterarrivalTime[i]  // Clock time of customer i arrival. [file:1]
- ServiceBegin[i] = max(ArrivalTime[i], ServiceEnd[i−1])  // Service starts when both customer has arrived and server is free. [file:1]
- ServiceEnd[i] = ServiceBegin[i] + ServiceTime[i]  // Clock time service finishes for customer i. [file:1]
- WaitingTimeInQueue[i] = ServiceBegin[i] − ArrivalTime[i]  // Time customer waits before service begins. [file:1]
- TimeInSystem[i] = ServiceEnd[i] − ArrivalTime[i]  // Total time in system = waiting + service. [file:1]

---

## Simulation performance measures (computed from the simulation table)

- AvgWaitingTimeAll = (Total waiting time in queue) / (Total number of customers)  // Average waiting for everyone (including those who did not wait). [file:1]
- Prob(Wait) = (Number of customers who wait) / (Total number of customers)  // Probability that an arriving customer has to wait. [file:1]
- Prob(IdleServer) = (Total idle time of server) / (Total run time of simulation)  // Fraction of time the server is idle. [file:1]
- AvgServiceTime = (Total service time) / (Total number of customers)  // Empirical average service time from the simulation. [file:1]
- AvgTimeBetweenArrivals = (Sum of all interarrival times) / (Number of arrivals − 1)  // Empirical average interarrival time. [file:1]
- AvgWaitingTimeOfThoseWhoWait = (Total waiting time in queue) / (Number of customers who wait)  // Conditional average waiting time for only the customers who waited. [file:1]

- AvgTimeInSystem = AvgWaitingTimeAll + AvgServiceTime  // Relationship used to validate results: time in system = waiting + service. [file:1]

---

## Expected-value formulas used to compare simulation vs theory

- E(S) = Σ [ s * p(s) ]  // Expected (mean) service time from a discrete service-time distribution. [file:1]
- E(A) = (a + b) / 2  // Mean of a discrete uniform distribution over integers from a to b (as used for interarrival). [file:1]

---

## Inventory simulation: (M, N) periodic review system

- N = periodic review length  // Review cycle length in days/months (decision interval). [file:4]
- M = standard (maximum) inventory level  // Target inventory level after ordering (order-up-to level). [file:4]
- Qi = quantity of order i  // Order amount placed at review to “fill up” toward M. [file:4]
- Lead Time = time between placing and receiving an order  // Delay before replenishment arrives. [file:4]

- Events in an (M, N) system = { Demand, Review, Receipt of order }  // The discrete events driving the inventory simulation. [file:4]

- OrderQuantity Q = M − EndingInventory + Shortage  // Order-up-to calculation used at the end of each review cycle. [file:4]

---

## Inventory random-digit assignment rules (how demand/lead time are generated)

- CumulativeProbability[i] = Σ_{j=1..i} Probability[j]  // Convert a probability table into cumulative form to map random digits. [file:4]
- RandomDigitInterval[i] = range that corresponds to CumulativeProbability[i]  // Use cumulative ranges to translate random digits into outcomes (demand or lead time). [file:4]
- Ei = N / k  // Expected frequency per class in uniformity testing; used similarly as “expected count” logic when comparing observed vs expected. [file:3]

---

## Random Number Generation (RNG) requirements (statistical properties)

- Uniformity  // Random numbers should be uniformly distributed on [0, 1]. [file:2][file:3]
- Independence  // Random numbers should not depend on each other (no correlation/pattern). [file:2][file:3]

---

## Middle-square (midsquare) PRNG (algorithmic rule)

- 2n-digit square = (n-digit seed)²  // Square the seed to produce a 2n-digit result (pad leading zeros if needed). [file:2]
- NextSeed = middle n digits of the 2n-digit square  // Extract the middle n digits to form the next pseudorandom integer. [file:2]
- Ui = Zi / 10^n  // Convert an n-digit integer Zi into a [0,1) pseudorandom number (implied by the Ui column). [file:2]
- n must be even  // Condition for uniquely defined “middle n digits” in midsquare method. [file:2]

---

## Linear Congruential Generator (LCG) PRNG

- Zi = (a * Zi−1 + c) mod m  // LCG recurrence to generate integer sequence Zi. [file:2]
- 0 ≤ Zi ≤ m − 1  // Range of the generated integers from modulus arithmetic. [file:2]
- Ui = Zi / m  // Convert Zi to a uniform number on [0,1] (scaling). [file:2]

- a = multiplier  // LCG parameter (integer, typically < m). [file:2]
- c = increment  // LCG parameter (integer, typically < m). [file:2]
- m = modulus  // LCG modulus (noted as prime or power of a prime in the material). [file:2]
- Z0 = seed  // Starting integer value for the generator. [file:2]

- Period ≤ m  // The cycle length (period) of an LCG is at most m (full period when it equals m). [file:2]

---

## RNG recommendations (rules stated as “do/don’t”)

- Do not use seed = 0  // Can cause some generators to lock into zeros (degenerate sequence). [file:2]
- Do not use the same seed + same RNG for different input streams  // Can create correlation between samples (e.g., arrivals vs services). [file:2]
- Avoid even seeds (for some generators)  // Can reduce period in certain RNGs. [file:2]

---

## Random-number tests: hypotheses & significance level

### Uniformity test hypotheses
- H0: Ri ~ Uniform[0, 1]  // Null hypothesis: numbers are uniformly distributed on [0,1]. [file:3]
- H1: Ri not ~ Uniform[0, 1]  // Alternative: numbers are not uniform. [file:3]

### Independence test hypotheses
- H0: Ri are independent  // Null hypothesis: numbers are independent. [file:3]
- H1: Ri are not independent  // Alternative: dependence exists. [file:3]

### Significance level definition
- α = P(reject H0 | H0 true)  // Probability of Type I error (rejecting a true null). [file:3]

---

## Uniformity test: Chi-square (χ²) formulas

- Divide [0, 1) into k equal subintervals (classes)  // Binning step used by the χ² frequency test. [file:3]
- Ei = N / k  // Expected count in each class if the distribution is uniform. [file:3]
- χ² = Σ_{i=1..k} (Oi − Ei)² / Ei  // Chi-square statistic comparing observed vs expected counts. [file:3]
- df = k − 1  // Degrees of freedom for the chi-square distribution in this test. [file:3]
- Reject H0 if χ² > χ²_{α, k−1}  // Decision rule using the chi-square critical value. [file:3]
- Fail to reject H0 if χ² ≤ χ²_{α, k−1}  // If statistic is not large, uniformity is not rejected. [file:3]

---

## Independence test: Autocorrelation formulas

- x̄ = (Σ_{i=1..n} xi) / n  // Sample mean of the generated sequence. [file:3]
- s_x² = (1 / (N − 1)) * Σ_{i=1..N} (xi − x̄)²  // Sample variance (as shown in the dependency test steps). [file:3]
- s_x = sqrt(s_x²)  // Sample standard deviation. [file:3]

- r_xx(k) = (1 / (n − k)) * ( Σ_{i=1..n−k} (xi − x̄)(x_{i+k} − x̄) ) / (s_x * s_x)  // Autocorrelation at lag k (normalized covariance). [file:3]
- k ∈ {1, 2, ..., n − 1}  // Lags tested for a sequence of n random numbers. [file:3]

- If samples are independent, r_xx(k) should be theoretically 0  // Interpretation rule (ideal expectation). [file:3]
- Small |r_xx(k)| values indicate independence; large values close to 1 indicate dependence  // Practical interpretation guidance. [file:3]
