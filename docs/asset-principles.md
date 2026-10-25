# Universal 3D asset creation principles

Jerry, 2026-10-24: a reference standard for modeling, texturing, materials and color (version 1.0, engine-agnostic),
with his added rule on rendering and inspecting. AGENTS.md rule 19 and D-89 make it binding. It sits under
`docs/art-direction.md`, which says what these principles mean in Grave Shift's world; its twin for motion is
`docs/animation-principles.md`.

## I. Fundamental philosophy

**A successful 3D asset must communicate its identity, purpose, physical construction, material properties, and
artistic character through its geometry, surface detail, and color.**

An asset is not complete merely because its geometry resembles the requested object. Its proportions, silhouette,
material response, surface wear, color relationships, scale, and spatial construction must form a coherent visual
whole. All AI agents creating or modifying 3D assets must adhere to the following principles.

## II. Modeling

### 1. Silhouette comes first
An object's silhouette is its most important visual identifier.
- Establish the recognizable outline before adding surface details.
- Ensure the object can be identified without textures.
- Prioritize major shapes over small decorative geometry.
- Evaluate the silhouette from intended gameplay camera angles.
- Avoid unnecessary geometry that obscures important forms.

**Rule:** If an object cannot be recognized from its silhouette at its intended viewing distance, additional detailing
will not solve the fundamental design problem.

### 2. Correct proportions
- Establish overall dimensions before constructing components.
- Compare major dimensions against appropriate references.
- Maintain consistent relative sizes between related components.
- Respect anatomical proportions for organic models unless intentionally stylized.
- Exaggerate proportions only when justified by visual style or readability.

**Rule:** Proportional accuracy takes priority over surface complexity.

### 3. Primary, secondary, and tertiary forms
**Primary forms:** the large volumes defining the object's identity. **Secondary forms:** major components,
structural divisions, and recognizable features. **Tertiary forms:** small details, fasteners, seams, scratches, and
decorative features. Develop forms in this order. Do not add tertiary details until the primary and secondary forms
have been validated.

**Rule:** Large-scale structure must remain readable beneath smaller-scale detail.

### 4. Consistent scale
- Establish the intended real-world or fictional dimensions.
- Compare assets against known environmental references.
- Preserve consistent dimensions across related objects.
- Ensure scale is compatible with animation, physics, collision, and interaction systems.
- Avoid compensating for incorrect geometry by applying unexplained object-scale transforms.

**Rule:** Scale is a structural requirement, not an aesthetic afterthought.

### 5. Functional construction
Objects should appear capable of performing their intended functions.
- Mechanical components should connect plausibly.
- Hinges should rotate around appropriate axes.
- Doors require believable frames and clearance.
- Vehicles need coherent relationships between wheels, tracks, bodies, and suspension.
- Tools and equipment require appropriate gripping and attachment surfaces.
- Fictional technology must follow a consistent internal construction logic.

**Rule:** An object's visible construction must support its apparent purpose.

### 6. Structural hierarchy
- Separate independently moving components where appropriate.
- Establish clear parent-child relationships.
- Use predictable naming conventions.
- Preserve component orientations and pivots.
- Avoid unnecessary fragmentation into hundreds of disconnected objects.
- Avoid combining components that require independent control.

**Rule:** Model structure must support future manipulation, animation, and maintenance.

### 7. Appropriate topology
- Use clean edge flow around deformation areas.
- Concentrate geometry where silhouettes or deformation require it.
- Avoid unnecessary subdivisions on flat surfaces.
- Prevent unintended overlapping faces and degenerate geometry.
- Maintain coherent normals and winding.
- Use watertight geometry when required, but do not demand it unnecessarily for ordinary game meshes.
- Triangles and n-gons may be acceptable depending on the final pipeline and deformation requirements.

**Rule:** Good topology is topology that supports shading, deformation, performance, and editing.

### 8. Geometry efficiency
Every polygon should contribute to meaningful shape, deformation, or shading.
- Do not model details that normal maps can communicate adequately.
- Retain geometry for important silhouette changes.
- Remove hidden geometry when safe and useful.
- Optimize repeated components through instancing.
- Use appropriate levels of detail.
- Avoid excessive mesh density without measurable visual improvement.

**Rule:** Geometry complexity must be justified by visible or functional benefit.

### 9. Shape language
- Rounded shapes can communicate softness, accessibility, or organic construction.
- Angular shapes can communicate rigidity, danger, or engineered precision.
- Large simple masses communicate stability and weight.
- Thin irregular forms can communicate fragility or unnatural construction.
- Repeated shapes establish recognizable design families.

These are artistic tendencies, not absolute rules.

**Rule:** Choose a deliberate shape language and maintain it throughout related assets.

### 10. Bevels and edge definition
Perfectly sharp edges often appear visually artificial on manufactured objects.
- Add bevels to appropriate edges.
- Adjust bevel width according to object scale and manufacturing method.
- Preserve intentionally sharp geometry where required.
- Avoid uniformly rounding every edge.
- Ensure edge highlights support the intended material.

**Rule:** Edges must communicate how an object was manufactured and how light interacts with it.

### 11. Mechanical and biological plausibility
For mechanical objects: maintain functional joints; respect component clearances; use consistent thicknesses where
manufacturing implies them; establish believable attachment systems.
For biological objects: follow coherent skeletal and anatomical relationships; preserve the relationship between
muscles, joints, and body volume; provide topology suitable for expected deformation; avoid arbitrary intersections
or disconnected anatomical features.
For supernatural objects: establish which natural rules are being violated intentionally; maintain consistency in the
resulting fictional anatomy or mechanics.

**Rule:** Unusual design does not justify accidental structural incoherence.

### 12. Negative space
- Preserve gaps that make mechanical assemblies readable.
- Maintain clear separation between limbs and bodies where possible.
- Use openings to establish scale and depth.
- Avoid filling every available surface with geometry.
- Consider how negative space affects silhouettes.

**Rule:** Design the spaces around and within an object as deliberately as the object itself.

## III. Texturing

### 13. Materials must describe substance
Steel reflects light differently from rubber; painted metal behaves differently from bare metal; aged wood differs
from newly cut wood; wet stone responds differently from dry stone; skin differs from leather despite possible
similarities in color.

**Rule:** Material identity is primarily established through surface response, structure, and context, not color alone.

### 14. Physically based rendering
Use a physically based material workflow whenever the project supports it. For metallic-roughness, understand the
roles of base color, metallic, roughness, normal, ambient occlusion, emission, and height or displacement where
supported. Subsurface scattering, transmission and clearcoat may be used when needed.

**Rule:** Material parameters must have physically and artistically coherent relationships.

### 15. Base color integrity
- Do not paint strong directional lighting into base-color textures unless the style intentionally requires it.
- Avoid arbitrary highlights and shadows that conflict with dynamic lighting.
- Do not use overly bright or dark values without material justification.
- Preserve meaningful color variation.
- Avoid substituting color variation for actual surface information.

**Rule:** Base color describes the material under neutral conditions; the lighting system describes how it is lit.

### 16. Roughness defines surface character
- Polished surfaces produce tighter reflections; rough surfaces broader ones.
- Oils, dust, wear, coatings, and moisture may affect roughness.
- Large surfaces rarely have perfectly uniform roughness.
- Variation must reflect believable causes.

**Rule:** Roughness variation should reflect material behavior and surface history, not random noise.

### 17. Metallic accuracy
- Exposed metals are generally represented as metallic.
- Plastic, wood, skin, stone, dirt, and most paint layers are nonmetallic.
- Painted metal usually behaves as a dielectric coating at its surface.
- Exposed scratches may reveal metallic material underneath.
- Intermediate metallic values are primarily useful for transitions, filtering, or particular authored effects.

**Rule:** Do not use the metallic channel merely to make a material appear shinier.

### 18. Surface detail hierarchy
**Macro:** major color changes, structural divisions, large stains, material boundaries. **Medium:** scratches,
panels, seams, cracks, dents, localized wear. **Micro:** fine grain, pores, subtle roughness variation, manufacturing
texture. Detail density must be appropriate to camera distance and artistic style.

**Rule:** Texture complexity must support underlying form rather than obscure it.

### 19. Purposeful wear and weathering
Consider contact points, friction, exposure to weather, gravity, fluid accumulation, mechanical stress, handling, age,
and maintenance history. Frequently handled surfaces may lose paint or accumulate oils; recesses may accumulate dust;
exposed edges may chip; water may create directional staining; outdoor structures weather by orientation.

**Rule:** Wear must communicate a plausible history, not simply make an object look detailed.

### 20. Avoid procedural noise abuse
- Use noise to supplement meaningful material structure.
- Control frequency, scale, intensity, and distribution.
- Avoid applying identical noise patterns to unrelated materials.
- Prevent high-frequency detail from causing visible shimmer.
- Use masks and directional processes when generating wear.

**Rule:** Every procedural texture pattern should have a plausible visual or physical explanation.

### 21. UV mapping quality
Minimize visible stretching; keep appropriate texel density; place seams thoughtfully; preserve adequate island
padding; give more texture space to important visible regions; use mirroring selectively, and not where unique
directional markings or damage are essential.

**Rule:** UV space should be allocated according to visibility, importance, and intended use.

### 22. Normal map integrity
Bake from appropriate high-resolution geometry when applicable; use the tangent-space convention the renderer expects;
verify orientation and channel conventions; prevent inverted lighting and seam artifacts; avoid normal-map detail that
contradicts the actual silhouette.

**Rule:** Normal maps must enhance surface shape without producing physically contradictory shading.

### 23. Consistent material scale
Wood grain, stone size, metal brushing direction and density, fabric weave, scratches and imperfections all match the
object's real or intended scale.

**Rule:** A texture that looks convincing on one object may look incorrect at another scale.

### 24. Texture resolution efficiency
Estimate on-screen pixel coverage; keep consistent texel-density policies; avoid oversized maps for small or distant
objects; consider atlases, trim sheets and reusable materials; use mipmaps and engine-appropriate compression; pack
channels for the target renderer.

**Rule:** Texture memory must be justified by visible improvement.

### 25. Material consistency across assets
Similar painted metals share a baseline roughness; related uniforms share fabric behavior; wood of one architectural
style shares grain and treatment; materials vary with age and use without losing their common identity.

**Rule:** Establish shared material families rather than reinventing material behavior for every object.

## IV. Color

### 26. Color must have purpose
Color may communicate material identity, function, importance, danger, affiliation, age, mood, environmental
conditions, and narrative meaning.

**Rule:** Do not assign colors arbitrarily when a meaningful visual system can be established.

### 27. Value hierarchy
Brightness relationships often matter more than hue. Important elements stay recognizable in grayscale; not every part
gets similar emphasis; evaluate under the intended lighting; keep useful contrast without flattening material identity.

**Rule:** Form and focal points must remain understandable without relying entirely on hue.

### 28. Hue relationships
Analogous colors for harmony, complementary for emphasis, warm and cool contrasts for depth or mood, neutral palettes
with selective accents, monochromatic palettes for unified design. No harmony is universally required.

**Rule:** Color combinations must reinforce the intended visual character rather than result from uncontrolled
selection.

### 29. Saturation hierarchy
Reserve strong saturation for focal areas; don't make every component equally colorful; subdue materials where realism
or atmosphere requires it; account for final lighting and grading.

**Rule:** Saturation should support visual hierarchy.

### 30. Large, medium, and small color distribution
A possible starting distribution: 60% dominant family, 30% supporting, 10% accent (optional guidelines).

**Rule:** Give the viewer a clear dominant color structure rather than equally competing color regions.

### 31. Color and material must agree
Black-painted steel is not black rubber; yellow plastic is not polished gold; pale stone is not glossy ceramic; a
painted surface keeps the distinction between its coating and what is exposed beneath.

**Rule:** Color, roughness, metallic response, and surface structure must describe the same substance.

### 32. Environmental color relationships
Consider ambient lighting, atmosphere, the environment's palette, surface contamination, local materials, architectural
or cultural context, and art direction.

**Rule:** Assets must feel visually connected to the world they inhabit while preserving appropriate distinctions.

### 33. Narrative color language
Military equipment may use restrained, functional palettes; industrial equipment standardized marking colors;
supernatural objects unfamiliar or contradictory color relationships; rare materials recurring color
characteristics. Exceptions are powerful where expectations already exist.

**Rule:** Repeated color patterns should establish meaning, and deliberate departures should reinforce that meaning.

### 34. Readability under lighting
Evaluate in direct sunlight, overcast light, interior lighting, darkness, colored lighting, and after post-processing
and grading.

**Rule:** Validate final colors inside the destination rendering environment.

### 35. Accessibility and functional clarity
Support color with shape or pattern; keep distinguishable values; never rely solely on red versus green; keep
important objects identifiable under difficult lighting.

**Rule:** Color should reinforce gameplay information rather than serve as its only indicator.

## V. Cohesion and game integration

### 36. Match the project's visual language
Proportions, shape language, surface complexity, material realism, palette, edge treatment, geometric density, texture
frequency, lighting response.

**Rule:** An asset can be individually impressive and still fail if it contradicts the game's visual identity.

### 37. Camera-dependent detail
For distant or top-down cameras: recognizable silhouettes, major forms, no excess tiny geometry, color patterns that
stay visible, simplified clutter. For close-up or first-person cameras: quality surface detail, attention to contact
surfaces, better geometry at edges and intersections, material responses validated at close range.

**Rule:** Create detail for the camera that will actually display the asset.

### 38. Consistent lighting and shading
Validate normals; confirm the shader; check transparent and opaque behavior; verify reflections; avoid unintentional
black surfaces, shading seams or excessive highlights; check ambient occlusion and shadows.

**Rule:** A model is not visually complete until it has been evaluated with its intended shader and lighting pipeline.

### 39. Animation and physics readiness
Topology suitable around joints; pivots at meaningful rotational locations; appropriate rigging; clear component
separation; dimensions suitable for collision; no geometry obstructing expected movement.

**Rule:** Modeling decisions must anticipate the object's behavior after export.

### 40. Reuse and modularity
Share common materials; modular architectural pieces; consistent attachment interfaces; reuse recurring details and
trim sheets; instancing where beneficial; variation through controlled parameters.

**Rule:** Reuse should increase consistency and efficiency without visibly unnatural repetition.

### 41. Technical export integrity
Validate format, units and axes, origin and pivot, transforms, normals and tangents, UVs, texture paths, material
assignments, naming, rig compatibility, collision, LODs, and the target engine's import behavior.

**Rule:** An asset is not finished until it imports and functions correctly in the destination project.

## VI. The asset creation protocol

1. **Define the asset:** identity and purpose, dimensions, style, gameplay camera, expected screen size, interactions,
   materials, animation, performance constraints, engine and renderer. Missing requirements take the project's
   defaults, written down as assumptions.
2. **Gather references** for silhouette, proportions, construction, materials, color, wear, and manufacturing or
   biological structure. Don't reproduce a reference that contradicts the art direction or technical requirements.
3. **Blockout:** primary forms only. Validate scale, silhouette, proportions, orientation, readability, spatial
   relationships before any fine detail.
4. **Develop geometry:** secondary forms and the necessary tertiary details. Check construction, topology, joints,
   intersections, shading, polygon efficiency.
5. **UVs and materials:** layouts or project-approved procedural mappings; coherent material categories before
   detailed texturing.
6. **Textures** from material properties, manufacture, exposure, use and wear, scale and style; no arbitrary noise.
7. **Color** from material identity, value hierarchy, hue, saturation, narrative significance, environment. Review in
   grayscale and under representative game lighting.
8. **Test in context:** the standard gameplay camera, typical distance, close-up inspection, representative lighting,
   expected animation or interaction states.
9. **Optimize:** polygons, draw calls, materials, texture memory, LOD, reuse, renderer limits; never quality cut only
   to hit an arbitrary number.
10. **Validate and deliver:** automated checks, then visual inspection. Record the name, dimensions, polygon count,
    materials, texture resolutions, rig compatibility, sources, export format, known issues, validation results.

## VII. Visual quality control

Score each applicable category 0-5 (0 broken or missing; 1 severe flaws; 2 major improvements required; 3 functional
but visibly unpolished; 4 convincing and production-appropriate; 5 excellent). **The production target is 4 or higher
in every applicable category.** Structural and integration failures are corrected regardless of the score.

| Category | Evaluation |
| --- | --- |
| Silhouette | Is the object recognizable? |
| Proportions | Are the dimensions internally consistent? |
| Construction | Does its geometry make functional or fictional sense? |
| Topology | Is the mesh structurally appropriate? |
| Geometry efficiency | Is complexity justified? |
| UV quality | Are mapping and texel density suitable? |
| Materials | Do surfaces communicate their substances? |
| Textures | Is detail coherent, correctly scaled, and purposeful? |
| Color | Does the palette establish visual hierarchy and identity? |
| Style | Does the object fit the artistic direction? |
| Readability | Can it be understood from its intended camera? |
| Integration | Does it work correctly inside the game engine? |

**Common failures to detect and correct:** incorrect proportions; poor silhouettes; excessive polygon counts; arbitrary
or floating geometry; misaligned mechanical components; unnatural anatomical structure; missing functional
connections; unnecessary decorative complexity; incorrect normals; UV stretching; visible unintended seams;
inconsistent texel density; excessively glossy or uniformly rough materials; incorrect metallic properties; unnatural
randomized dirt and damage; repetitive procedural patterns; overly saturated colors; poor value hierarchy; materials
that conflict with the style; missing or incorrect texture assignments; excessive material duplication; improper
pivots and transforms; incorrect scale on export; incompatible rigs or animation structures; poor visibility at
gameplay distance.

**Correction order:** 1. geometry and proportion errors; 2. structural and technical defects; 3. silhouette and
readability; 4. material identity; 5. color relationships; 6. texture detail and wear; 7. fine decorative polish.
Never conceal a major geometry defect with more texturing.

## VIII. Operating directives

- **A. Form before detail.** **B. Purpose before decoration.** **C. Materials before textures.**
- **D. Physical logic before randomness.** **E. Consistency before individual novelty.**
- **F. Readability before complexity:** important forms survive the actual gameplay camera and distance.
- **G. Validate visually.** Mesh generation, shader compilation or export does not prove the asset looks correct.
- **H. Optimize intelligently.** **I. Preserve editability:** organized, well-named geometry, materials, textures.
- **J. Iterate using evidence:** find specific defects, correct their causes, retest; don't keep adding detail.
- **K. Report limitations:** never claim a visual or technical check that wasn't actually performed.
- **L. Preserve design intent:** realism, stylization, exaggeration and the supernatural are valid when deliberate and
  consistent.

## IX. Final governing principle

**A great 3D asset is not defined by polygon count, texture resolution, shader complexity, or the amount of visible
detail.** It is defined by how effectively its shape, construction, materials, colors, and proportions communicate a
coherent visual identity. Prioritize recognizability, structural coherence, material credibility, artistic
consistency, and technical reliability over unnecessary complexity.

## Jerry's added rule: render it and look

**Never judge a model only from code or geometry statistics.** Render it and inspect it from several angles, in
several lighting conditions (day, overcast or rain, night with his light), and at actual gameplay scale (the standard
third-person view and first person at his eyes), in three passes:

1. **Geometry review:** shape, proportions, silhouette.
2. **Material review:** texture, roughness, surface detail.
3. **Context review:** color, lighting, how it sits with what's round it.

In this repo: `node tools/camera.mjs check <id>` and the inspector (AGENTS.md rule 7) for the model alone; the sweep's
shot lists (`tools/sweep/`, the approach, his eyes, from above, at night) for it in place; Antigravity's GPU shots for
the real renderer. A handoff names the shots it was judged from.
