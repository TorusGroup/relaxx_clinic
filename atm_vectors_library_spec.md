# ATM Analyzer - Biblioteca de Detecção de Vetores e Cálculos

## 🎯 Visão Geral da Biblioteca

### Objetivo Principal
Desenvolver uma biblioteca Python especializada para detecção, análise e cálculo de vetores faciais com foco específico na articulação temporomandibular (ATM), fornecendo métricas precisas e clinicamente relevantes para diagnóstico e acompanhamento de distúrbios da ATM.

### Proposta de Valor
**"Transformar pontos faciais em insights médicos acionáveis através de computação geométrica avançada e algoritmos biomecânicos validados cientificamente."**

### Diferencial Competitivo
- **Especialização ATM**: Algoritmos específicos para anatomia mandibular
- **Precisão Clínica**: Calibração automática para medições em milímetros
- **Performance Real-time**: Otimizado para processamento em tempo real
- **Explicabilidade**: Cada cálculo com justificativa científica
- **Extensibilidade**: Arquitetura modular para novos algoritmos

## 🏗️ Arquitetura da Biblioteca

### Estrutura Modular Proposta
```
atm_vectors_lib/
├── core/                           # Núcleo fundamental
│   ├── __init__.py
│   ├── base_detector.py           # Classe base para detectores
│   ├── vector_math.py             # Matemática vetorial
│   ├── calibration.py             # Sistema de calibração
│   └── exceptions.py              # Exceções customizadas
├── detectors/                      # Detectores especializados
│   ├── __init__.py
│   ├── mediapipe_detector.py      # Wrapper MediaPipe otimizado
│   ├── face_mesh_detector.py      # Face mesh especializado
│   ├── jaw_contour_detector.py    # Contorno mandibular
│   └── eye_reference_detector.py  # Pontos de referência oculares
├── analyzers/                      # Analisadores biomecânicos
│   ├── __init__.py
│   ├── jaw_movement_analyzer.py   # Análise movimento mandibular
│   ├── symmetry_analyzer.py       # Análise de simetria facial
│   ├── posture_analyzer.py        # Análise postural
│   └── temporal_analyzer.py       # Análise temporal/sequencial
├── calculators/                    # Calculadoras de métricas
│   ├── __init__.py
│   ├── distance_calculator.py     # Cálculos de distância
│   ├── angle_calculator.py        # Cálculos angulares
│   ├── area_calculator.py         # Cálculos de área
│   └── volume_calculator.py       # Estimativas volumétricas
├── metrics/                        # Métricas clínicas
│   ├── __init__.py
│   ├── atm_metrics.py            # Métricas específicas ATM
│   ├── clinical_scores.py        # Scores clínicos validados
│   └── normative_data.py         # Dados normativos população
├── calibration/                    # Sistema de calibração
│   ├── __init__.py
│   ├── auto_calibrator.py        # Calibração automática
│   ├── reference_objects.py      # Objetos de referência
│   └── facial_proportions.py     # Proporções faciais conhecidas
├── visualization/                  # Visualização e debug
│   ├── __init__.py
│   ├── vector_plotter.py         # Plotagem de vetores
│   ├── heatmap_generator.py      # Mapas de calor
│   └── animation_creator.py      # Animações de movimento
├── utils/                          # Utilitários auxiliares
│   ├── __init__.py
│   ├── image_preprocessor.py     # Pré-processamento imagem
│   ├── video_processor.py        # Processamento vídeo
│   ├── data_validator.py         # Validação de dados
│   └── performance_profiler.py   # Profiling de performance
└── tests/                          # Testes unitários e integração
    ├── unit/
    ├── integration/
    └── performance/
```

## 🔬 Especificações Técnicas Detalhadas

### Core Module - Fundação Matemática

#### **1. Base Detector (core/base_detector.py)**
**Objetivo**: Classe abstrata para todos os detectores de landmarks

```python
class BaseLandmarkDetector(ABC):
    """
    Classe base para detectores de landmarks faciais
    Define interface padrão e funcionalidades comuns
    """
    
    def __init__(self, config: DetectorConfig):
        self.config = config
        self.calibration_data = None
        self.performance_metrics = PerformanceMetrics()
    
    @abstractmethod
    def detect_landmarks(self, image: np.ndarray) -> LandmarkSet:
        """Detecta landmarks na imagem"""
        pass
    
    @abstractmethod
    def validate_detection(self, landmarks: LandmarkSet) -> ValidationResult:
        """Valida qualidade da detecção"""
        pass
    
    def calibrate(self, calibration_input: CalibrationInput) -> CalibrationResult:
        """Sistema de calibração padrão"""
        pass
```

**Funcionalidades Principais:**
- [ ] Interface padronizada para detectores
- [ ] Sistema de configuração flexível
- [ ] Validação automática de qualidade
- [ ] Métricas de performance integradas
- [ ] Cache inteligente de resultados
- [ ] Fallback para múltiplos detectores
- [ ] Threading seguro para uso concorrente

#### **2. Vector Math (core/vector_math.py)**
**Objetivo**: Biblioteca matemática otimizada para cálculos geométricos 3D

```python
class VectorMath:
    """
    Operações matemáticas otimizadas para análise facial 3D
    Foco em performance e precisão numérica
    """
    
    @staticmethod
    @numba.jit(nopython=True)
    def calculate_distance_3d(point1: Point3D, point2: Point3D) -> float:
        """Distância euclidiana 3D otimizada"""
        pass
    
    @staticmethod
    def calculate_angle_between_vectors(v1: Vector3D, v2: Vector3D) -> float:
        """Ângulo entre vetores com estabilidade numérica"""
        pass
    
    @staticmethod
    def project_point_to_plane(point: Point3D, plane: Plane3D) -> Point3D:
        """Projeção de ponto em plano"""
        pass
```

**Funcionalidades Implementadas:**
- [ ] Distâncias euclidianas 2D/3D otimizadas
- [ ] Cálculos angulares estáveis numericamente
- [ ] Projeções geométricas complexas
- [ ] Transformações de coordenadas
- [ ] Interpolação e suavização de trajetórias
- [ ] Detecção de outliers geométricos
- [ ] Algoritmos de fitting (linha, círculo, elipse)

#### **3. Calibration System (core/calibration.py)**
**Objetivo**: Sistema robusto de calibração para medições precisas

```python
class AutoCalibrator:
    """
    Sistema de calibração automática multi-modal
    Combina múltiplas estratégias para máxima precisão
    """
    
    def __init__(self):
        self.strategies = [
            FacialProportionCalibrator(),
            ReferenceObjectCalibrator(),
            BiometricCalibrator(),
            CameraIntrinsicsCalibrator()
        ]
    
    def calibrate(self, input_data: CalibrationInput) -> CalibrationResult:
        """Calibração automática com múltiplas estratégias"""
        results = []
        
        for strategy in self.strategies:
            if strategy.can_calibrate(input_data):
                result = strategy.calibrate(input_data)
                results.append(result)
        
        return self.fuse_calibration_results(results)
```

**Estratégias de Calibração:**
- [ ] **Proporções faciais conhecidas**: Distância interpupilar, largura facial
- [ ] **Objetos de referência**: Moedas, cartões, objetos conhecidos
- [ ] **Dados biométricos**: Altura, idade, etnia para estimativas
- [ ] **Parâmetros intrínsecos**: Focal length, distorção da câmera
- [ ] **Multi-frame fusion**: Combinação de múltiplas detecções
- [ ] **Machine learning**: Modelo treinado para estimativa de escala

### Detectors Module - Detecção Especializada

#### **1. MediaPipe Detector (detectors/mediapipe_detector.py)**
**Objetivo**: Wrapper otimizado do MediaPipe para uso em produção

```python
class OptimizedMediaPipeDetector(BaseLandmarkDetector):
    """
    MediaPipe otimizado para análise ATM
    Performance e precisão maximizadas
    """
    
    def __init__(self, config: MediaPipeConfig):
        super().__init__(config)
        self.face_mesh = self._initialize_face_mesh()
        self.landmark_cache = LRUCache(maxsize=100)
        self.quality_filter = QualityFilter()
    
    def detect_landmarks(self, image: np.ndarray) -> ATMLandmarkSet:
        """Detecção otimizada com cache e filtros"""
        
        # 1. Verificar cache
        image_hash = self._hash_image(image)
        if image_hash in self.landmark_cache:
            return self.landmark_cache[image_hash]
        
        # 2. Pré-processamento otimizado
        processed_image = self._preprocess_image(image)
        
        # 3. Detecção MediaPipe
        results = self.face_mesh.process(processed_image)
        
        # 4. Converter para formato padrão
        landmarks = self._convert_to_atm_landmarks(results)
        
        # 5. Filtro de qualidade
        landmarks = self.quality_filter.filter(landmarks)
        
        # 6. Cache resultado
        self.landmark_cache[image_hash] = landmarks
        
        return landmarks
```

**Otimizações Implementadas:**
- [ ] **Cache inteligente** para imagens similares
- [ ] **Pré-processamento** otimizado (contrast, brightness)
- [ ] **Filtros de qualidade** para landmarks instáveis
- [ ] **Subset específico** para ATM (468 → 68 pontos críticos)
- [ ] **Temporal smoothing** para sequências de vídeo
- [ ] **Multi-threading** seguro para batch processing
- [ ] **Memory pooling** para reduzir garbage collection

#### **2. Jaw Contour Detector (detectors/jaw_contour_detector.py)**
**Objetivo**: Detector especializado para contorno mandibular preciso

```python
class JawContourDetector:
    """
    Detector especializado para contorno mandibular
    Combina MediaPipe com algoritmos de contorno customizados
    """
    
    def __init__(self):
        self.edge_detector = CannyEdgeDetector()
        self.contour_fitter = EllipseFitter()
        self.mediapipe_backup = MediaPipeDetector()
    
    def detect_jaw_contour(self, image: np.ndarray, landmarks: LandmarkSet) -> JawContour:
        """
        Detecção híbrida de contorno mandibular
        Combina landmarks com detecção de bordas
        """
        
        # 1. Região de interesse baseada em landmarks
        jaw_roi = self._extract_jaw_roi(image, landmarks)
        
        # 2. Detecção de bordas adaptativa
        edges = self.edge_detector.detect(jaw_roi)
        
        # 3. Fitting de contorno
        contour_points = self.contour_fitter.fit(edges)
        
        # 4. Validação com landmarks MediaPipe
        validated_contour = self._validate_with_landmarks(contour_points, landmarks)
        
        # 5. Suavização temporal se disponível
        if hasattr(self, 'previous_contour'):
            validated_contour = self._temporal_smoothing(validated_contour)
        
        return validated_contour
```

**Funcionalidades Avançadas:**
- [ ] **Hybrid approach**: MediaPipe + edge detection + contour fitting
- [ ] **Adaptive thresholding**: Ajuste automático para diferentes iluminações
- [ ] **Temporal consistency**: Suavização entre frames
- [ ] **Sub-pixel precision**: Interpolação para precisão sub-pixel
- [ ] **Robust fitting**: RANSAC para outlier rejection
- [ ] **Multi-scale analysis**: Análise em múltiplas escalas

### Analyzers Module - Análise Biomecânica

#### **1. Jaw Movement Analyzer (analyzers/jaw_movement_analyzer.py)**
**Objetivo**: Análise avançada de movimentos mandibulares

```python
class JawMovementAnalyzer:
    """
    Analisador especializado para movimentos da mandíbula
    Implementa métricas clínicas validadas
    """
    
    def __init__(self, config: AnalyzerConfig):
        self.config = config
        self.trajectory_analyzer = TrajectoryAnalyzer()
        self.velocity_analyzer = VelocityAnalyzer()
        self.clinical_metrics = ClinicalMetrics()
    
    def analyze_jaw_opening(self, landmark_sequence: List[LandmarkSet]) -> JawOpeningAnalysis:
        """
        Análise completa de abertura mandibular
        Retorna métricas clínicas detalhadas
        """
        
        analysis = JawOpeningAnalysis()
        
        # 1. Trajetória de abertura
        opening_trajectory = self._calculate_opening_trajectory(landmark_sequence)
        analysis.trajectory = opening_trajectory
        
        # 2. Amplitude máxima
        max_opening = self._calculate_max_opening(opening_trajectory)
        analysis.max_opening_mm = max_opening
        
        # 3. Velocidade de abertura
        opening_velocity = self.velocity_analyzer.analyze(opening_trajectory)
        analysis.velocity_profile = opening_velocity
        
        # 4. Suavidade do movimento
        smoothness = self._calculate_movement_smoothness(opening_trajectory)
        analysis.smoothness_score = smoothness
        
        # 5. Desvios laterais
        lateral_deviation = self._calculate_lateral_deviation(opening_trajectory)
        analysis.lateral_deviation_mm = lateral_deviation
        
        # 6. Scores clínicos
        analysis.clinical_scores = self.clinical_metrics.calculate(analysis)
        
        return analysis
    
    def analyze_lateral_movement(self, landmark_sequence: List[LandmarkSet], 
                                direction: LateralDirection) -> LateralMovementAnalysis:
        """Análise de movimento lateral (esquerdo/direito)"""
        pass
    
    def analyze_protrusion(self, landmark_sequence: List[LandmarkSet]) -> ProtrusionAnalysis:
        """Análise de protrusão mandibular"""
        pass
```

**Métricas Implementadas:**
- [ ] **Maximum opening**: Abertura máxima em mm
- [ ] **Comfortable opening**: Abertura confortável
- [ ] **Lateral excursion**: Movimento lateral esquerdo/direito
- [ ] **Protrusion distance**: Distância de protrusão
- [ ] **Movement velocity**: Perfil de velocidade
- [ ] **Trajectory smoothness**: Suavidade do movimento
- [ ] **Symmetry index**: Índice de simetria
- [ ] **Deflection angle**: Ângulo de desvio

#### **2. Symmetry Analyzer (analyzers/symmetry_analyzer.py)**
**Objetivo**: Análise quantitativa de simetria facial

```python
class SymmetryAnalyzer:
    """
    Analisador de simetria facial multi-dimensional
    Implementa algoritmos state-of-the-art
    """
    
    def __init__(self):
        self.plane_calculator = SymmetryPlaneCalculator()
        self.distance_calculator = SymmetryDistanceCalculator()
        self.statistical_analyzer = StatisticalSymmetryAnalyzer()
    
    def analyze_facial_symmetry(self, landmarks: LandmarkSet) -> SymmetryAnalysis:
        """
        Análise completa de simetria facial
        Multiple approaches for robust results
        """
        
        analysis = SymmetryAnalysis()
        
        # 1. Plano de simetria médio-sagital
        symmetry_plane = self.plane_calculator.calculate_midsagittal_plane(landmarks)
        analysis.symmetry_plane = symmetry_plane
        
        # 2. Distâncias ponto-a-plano
        point_distances = self.distance_calculator.calculate_distances(landmarks, symmetry_plane)
        analysis.point_distances = point_distances
        
        # 3. Análise regional
        regional_symmetry = self._analyze_regional_symmetry(landmarks, symmetry_plane)
        analysis.regional_scores = regional_symmetry
        
        # 4. Score global de simetria
        global_symmetry = self._calculate_global_symmetry_score(point_distances)
        analysis.global_symmetry_score = global_symmetry
        
        # 5. Comparação com população normativa
        normative_comparison = self._compare_with_normative_data(analysis)
        analysis.normative_percentile = normative_comparison
        
        return analysis
```

**Algoritmos de Simetria:**
- [ ] **Midsagittal plane**: Cálculo do plano médio-sagital
- [ ] **Point-to-plane distances**: Distâncias pontos ao plano
- [ ] **Procrustes analysis**: Análise de sobreposição
- [ ] **Regional symmetry**: Simetria por regiões faciais
- [ ] **Statistical shape analysis**: Análise estatística de forma
- [ ] **Normative comparison**: Comparação com dados populacionais

### Calculators Module - Computação de Métricas

#### **1. Distance Calculator (calculators/distance_calculator.py)**
**Objetivo**: Cálculos de distância otimizados e precisos

```python
class DistanceCalculator:
    """
    Calculadora de distâncias otimizada
    Suporte para múltiplas métricas e calibração automática
    """
    
    def __init__(self, calibration_data: CalibrationData):
        self.calibration = calibration_data
        self.cache = DistanceCache()
    
    @performance_monitor
    def calculate_euclidean_distance(self, p1: Point3D, p2: Point3D, 
                                   unit: DistanceUnit = DistanceUnit.MM) -> Distance:
        """
        Distância euclidiana 3D com calibração automática
        """
        
        # 1. Cache check
        cache_key = self._generate_cache_key(p1, p2, unit)
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # 2. Cálculo bruto em pixels
        pixel_distance = np.sqrt(
            (p1.x - p2.x)**2 + 
            (p1.y - p2.y)**2 + 
            (p1.z - p2.z)**2
        )
        
        # 3. Conversão para unidade real
        if unit == DistanceUnit.MM:
            real_distance = pixel_distance * self.calibration.pixel_to_mm_ratio
        elif unit == DistanceUnit.CM:
            real_distance = pixel_distance * self.calibration.pixel_to_mm_ratio / 10
        
        # 4. Criar objeto Distance com metadados
        distance = Distance(
            value=real_distance,
            unit=unit,
            confidence=self.calibration.confidence,
            p1=p1, p2=p2,
            calculation_method="euclidean_3d"
        )
        
        # 5. Cache resultado
        self.cache[cache_key] = distance
        
        return distance
    
    def calculate_jaw_opening_distance(self, landmarks: LandmarkSet) -> Distance:
        """Distância específica para abertura mandibular"""
        
        # Pontos específicos para abertura mandibular
        upper_lip = landmarks.get_point(LandmarkIndex.UPPER_LIP_CENTER)
        lower_lip = landmarks.get_point(LandmarkIndex.LOWER_LIP_CENTER)
        
        # Compensação para espessura dos lábios
        compensated_distance = self._compensate_lip_thickness(
            self.calculate_euclidean_distance(upper_lip, lower_lip)
        )
        
        return compensated_distance
```

**Tipos de Distâncias:**
- [ ] **Euclidean 2D/3D**: Distâncias diretas
- [ ] **Geodesic**: Distâncias sobre superfície
- [ ] **Anatomical**: Distâncias anatomicamente relevantes
- [ ] **Compensated**: Distâncias com compensação de tecidos moles
- [ ] **Projected**: Distâncias em planos específicos
- [ ] **Temporal**: Distâncias ao longo do tempo

#### **2. Angle Calculator (calculators/angle_calculator.py)**
**Objetivo**: Cálculos angulares para análise postural e movimento

```python
class AngleCalculator:
    """
    Calculadora de ângulos especializada para análise facial
    Implementa ângulos clínicos padronizados
    """
    
    def calculate_jaw_angle(self, landmarks: LandmarkSet) -> Angle:
        """
        Ângulo da mandíbula (ângulo goníaco)
        Relevante para análise de crescimento e desenvolvimento
        """
        
        # Pontos anatômicos para ângulo mandibular
        gonion_left = landmarks.get_point(LandmarkIndex.GONION_LEFT)
        gonion_right = landmarks.get_point(LandmarkIndex.GONION_RIGHT)
        menton = landmarks.get_point(LandmarkIndex.MENTON)
        
        # Vetores para cálculo angular
        left_vector = Vector3D.from_points(menton, gonion_left)
        right_vector = Vector3D.from_points(menton, gonion_right)
        
        # Ângulo entre vetores
        angle_radians = self._angle_between_vectors(left_vector, right_vector)
        angle_degrees = np.degrees(angle_radians)
        
        return Angle(
            value=angle_degrees,
            unit=AngleUnit.DEGREES,
            landmark_points=[gonion_left, gonion_right, menton],
            clinical_relevance="mandibular_angle"
        )
    
    def calculate_head_posture_angles(self, landmarks: LandmarkSet) -> PostureAngles:
        """Ângulos de postura cefálica (pitch, yaw, roll)"""
        pass
```

**Ângulos Implementados:**
- [ ] **Mandibular angle**: Ângulo goníaco
- [ ] **Facial angle**: Ângulo facial de perfil
- [ ] **Nasolabial angle**: Ângulo nasolabial
- [ ] **Head posture**: Pitch, yaw, roll da cabeça
- [ ] **Jaw deviation**: Ângulo de desvio mandibular
- [ ] **Facial profile**: Ângulos de convexidade facial

### Metrics Module - Métricas Clínicas

#### **1. ATM Metrics (metrics/atm_metrics.py)**
**Objetivo**: Métricas clínicas específicas para ATM

```python
class ATMMetrics:
    """
    Calculadora de métricas clínicas específicas para ATM
    Baseada em guidelines clínicos estabelecidos
    """
    
    def __init__(self, normative_data: NormativeData):
        self.normative_data = normative_data
        self.distance_calc = DistanceCalculator()
        self.angle_calc = AngleCalculator()
    
    def calculate_comprehensive_atm_score(self, analysis_data: ATMAnalysisData) -> ATMScore:
        """
        Score composto de saúde da ATM
        Combina múltiplas métricas em score único
        """
        
        score = ATMScore()
        
        # 1. Score de amplitude de movimento (40% do total)
        range_score = self._calculate_range_of_motion_score(analysis_data.movements)
        score.add_component("range_of_motion", range_score, weight=0.4)
        
        # 2. Score de simetria (30% do total)
        symmetry_score = self._calculate_symmetry_score(analysis_data.symmetry)
        score.add_component("symmetry", symmetry_score, weight=0.3)
        
        # 3. Score de suavidade de movimento (20% do total)
        smoothness_score = self._calculate_smoothness_score(analysis_data.movements)
        score.add_component("smoothness", smoothness_score, weight=0.2)
        
        # 4. Score de postura (10% do total)
        posture_score = self._calculate_posture_score(analysis_data.posture)
        score.add_component("posture", posture_score, weight=0.1)
        
        # 5. Calcular score final ponderado
        score.calculate_final_score()
        
        # 6. Classificação clínica
        score.clinical_classification = self._classify_atm_health(score.final_score)
        
        return score
    
    def calculate_improvement_metrics(self, baseline: ATMScore, 
                                    current: ATMScore) -> ImprovementMetrics:
        """Métricas de melhoria ao longo do tempo"""
        
        improvement = ImprovementMetrics()
        
        # Melhoria absoluta
        improvement.absolute_change = current.final_score - baseline.final_score
        
        # Melhoria percentual
        improvement.percentage_change = (improvement.absolute_change / baseline.final_score) * 100
        
        # Significância clínica
        improvement.clinically_significant = abs(improvement.absolute_change) > 5.0
        
        # Melhoria por componente
        for component in baseline.components:
            component_improvement = current.get_component_score(component.name) - component.score
            improvement.component_changes[component.name] = component_improvement
        
        return improvement
```

**Métricas Clínicas:**
- [ ] **Range of Motion Score**: Amplitude de movimento ponderada
- [ ] **Symmetry Index**: Índice de simetria mandibular
- [ ] **Movement Quality Score**: Qualidade e suavidade dos movimentos
- [ ] **Posture Impact Score**: Impacto da postura na ATM
- [ ] **Pain Correlation Score**: Correlação com indicadores de dor
- [ ] **Functional Limitation Index**: Índice de limitação funcional
- [ ] **Overall ATM Health Score**: Score composto final

## 🚀 Cronograma de Desenvolvimento

### **Sprint 1-2: Core Foundation (4 semanas)**

#### **Semana 1-2: Estrutura Base**
**Objetivos:**
- Criar arquitetura modular da biblioteca
- Implementar classes base e interfaces
- Setup de testes e CI/CD

**Tarefas Principais:**
- [ ] Estrutura de diretórios e módulos
- [ ] Classe BaseLandmarkDetector
- [ ] Core VectorMath com operações básicas
- [ ] Sistema de configuração flexível
- [ ] Testes unitários básicos
- [ ] Documentação inicial

**Entregáveis:**
- ✅ Estrutura modular funcionando
- ✅ Classes base implementadas
- ✅ Testes básicos passando
- ✅ CI/CD configurado

#### **Semana 3-4: Detecção e Calibração**
**Objetivos:**
- Implementar detectores MediaPipe otimizados
- Criar sistema de calibração automática
- Validação de qualidade

**Tarefas Principais:**
- [ ] MediaPipe Detector otimizado
- [ ] Sistema de calibração multi-estratégia
- [ ] Filtros de qualidade de landmarks
- [ ] Cache inteligente de detecções
- [ ] Validação automática de resultados

**Entregáveis:**
- ✅ Detector MediaPipe production-ready
- ✅ Calibração automática funcionando
- ✅ Sistema de cache otimizado
- ✅ Validação de qualidade implementada

### **Sprint 3-4: Análise Avançada (4 semanas)**

#### **Semana 5-6: Analisadores Biomecânicos**
**Objetivos:**
- Implementar análise de movimento mandibular
- Criar analisador de simetria facial
- Métricas de movimento temporal

**Tarefas Principais:**
- [ ] JawMovementAnalyzer completo
- [ ] SymmetryAnalyzer com múltiplos algoritmos
- [ ] TrajectoryAnalyzer para sequências
- [ ] VelocityAnalyzer para perfis de velocidade
- [ ] Temporal smoothing de dados

**Entregáveis:**
- ✅ Análise de movimento mandibular
- ✅ Análise de simetria facial
- ✅ Métricas temporais implementadas
- ✅ Algorithms de suavização

#### **Semana 7-8: Calculadoras e Métricas**
**Objetivos:**
- Implementar calculadoras de distância e ângulo
- Criar métricas clínicas específicas ATM
- Sistema de scores compostos

**Tarefas Principais:**
- [ ] DistanceCalculator com calibração
- [ ] AngleCalculator para análise postural
- [ ] ATMMetrics com scores clínicos
- [ ] ClinicalScores validados
- [ ] Comparação com dados normativos

**Entregáveis:**
- ✅ Calculadoras precisas e calibradas
- ✅ Métricas clínicas implementadas
- ✅ Sistema de scores funcionando
- ✅ Dados normativos integrados

### **Sprint 5-6: Otimização e Produção (4 semanas)**

#### **Semana 9-10: Performance e Escalabilidade**
**Objetivos:**
- Otimizar performance para tempo real
- Implementar paralelização
- Memory management avançado

**Tarefas Principais:**
- [ ] Profiling detalhado de performance
- [ ] Otimização com Numba/Cython
- [ ] Paralelização de cálculos
- [ ] Memory pooling e cache management
- [ ] Benchmark contra baseline

**